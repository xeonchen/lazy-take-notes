#!/usr/bin/env bash
# Convert any Whisper-family model to Transformers.js-compatible ONNX format,
# with optional int8 quantization and HuggingFace Hub upload.
#
# Prerequisites:
#   pip install "optimum[onnxruntime]" onnxruntime huggingface_hub
#   huggingface-cli login  # authenticate once (only needed for --upload)
#
# Usage:
#   # Convert Breeze-ASR-25 (default)
#   bash scripts/convert-whisper-onnx.sh
#
#   # Convert a different model
#   bash scripts/convert-whisper-onnx.sh --model openai/whisper-large-v3
#
#   # Convert and upload
#   bash scripts/convert-whisper-onnx.sh --upload YOUR_HF_USERNAME
#
#   # Full example with all options
#   bash scripts/convert-whisper-onnx.sh \
#     --model MediaTek-Research/Breeze-ASR-25 \
#     --output ./my-output \
#     --upload YOUR_HF_USERNAME \
#     --repo-suffix ONNX
#
# See docs/onnx-model-conversion.md for the complete guide.

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
MODEL_ID="MediaTek-Research/Breeze-ASR-25"
OUTPUT_DIR=""          # auto-derived from MODEL_ID if not set
QUANTIZED_DIR=""       # auto-derived from OUTPUT_DIR if not set
HF_USERNAME=""
REPO_SUFFIX="ONNX"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
usage() {
  cat <<USAGE
Usage: $0 [OPTIONS]

Options:
  --model MODEL_ID      HuggingFace model ID (default: MediaTek-Research/Breeze-ASR-25)
  --output DIR          Output directory for ONNX files (default: auto from model name)
  --upload HF_USERNAME  Upload quantized model to HuggingFace after conversion
  --repo-suffix SUFFIX  HF repo name suffix (default: ONNX → {model}-ONNX)
  -h, --help            Show this help message
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      MODEL_ID="${2:?'--model requires a HuggingFace model ID'}"
      shift 2
      ;;
    --upload)
      HF_USERNAME="${2:?'--upload requires a HuggingFace username'}"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="${2:?'--output requires a directory path'}"
      shift 2
      ;;
    --repo-suffix)
      REPO_SUFFIX="${2:?'--repo-suffix requires a value'}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

# Derive names from MODEL_ID if not explicitly set
MODEL_SHORT="${MODEL_ID##*/}"  # e.g. "Breeze-ASR-25" from "MediaTek-Research/Breeze-ASR-25"
MODEL_SLUG="$(echo "${MODEL_SHORT}" | tr '[:upper:]' '[:lower:]')"  # e.g. "breeze-asr-25"

if [[ -z "${OUTPUT_DIR}" ]]; then
  OUTPUT_DIR="./${MODEL_SLUG}-onnx"
fi
if [[ -z "${QUANTIZED_DIR}" ]]; then
  QUANTIZED_DIR="./${MODEL_SLUG}-onnx-q8"
fi

echo "==========================================="
echo "  Whisper ONNX Conversion"
echo "==========================================="
echo ""
echo "  Model:       ${MODEL_ID}"
echo "  Output:      ${OUTPUT_DIR}"
echo "  Quantized:   ${QUANTIZED_DIR}"
if [[ -n "${HF_USERNAME}" ]]; then
  echo "  Upload to:   ${HF_USERNAME}/${MODEL_SHORT}-${REPO_SUFFIX}"
fi
echo ""

# ---------------------------------------------------------------------------
# Check prerequisites
# ---------------------------------------------------------------------------
echo "=== Checking prerequisites ==="

missing=()
command -v python3 >/dev/null 2>&1 || missing+=("python3")
python3 -c "import optimum" 2>/dev/null || missing+=("optimum (pip install 'optimum[onnxruntime]')")
python3 -c "import onnxruntime" 2>/dev/null || missing+=("onnxruntime (pip install onnxruntime)")
command -v optimum-cli >/dev/null 2>&1 || missing+=("optimum-cli (pip install 'optimum[onnxruntime]')")

if [[ -n "${HF_USERNAME}" ]]; then
  command -v huggingface-cli >/dev/null 2>&1 || missing+=("huggingface-cli (pip install huggingface_hub)")
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "ERROR: Missing prerequisites:" >&2
  for m in "${missing[@]}"; do
    echo "  - $m" >&2
  done
  echo "" >&2
  echo "Install all at once:" >&2
  echo "  pip install 'optimum[onnxruntime]' onnxruntime huggingface_hub" >&2
  exit 1
fi

echo "All prerequisites found."
echo ""

# ---------------------------------------------------------------------------
# Step 1: Export to ONNX
# ---------------------------------------------------------------------------
echo "=== Step 1/3: Converting ${MODEL_ID} to ONNX ==="
echo "Output: ${OUTPUT_DIR}"
echo "This downloads model weights on first run (size varies by model)."
echo ""

optimum-cli export onnx \
  --model "${MODEL_ID}" \
  --task automatic-speech-recognition \
  "${OUTPUT_DIR}"

echo ""
echo "Conversion complete."

# ---------------------------------------------------------------------------
# Step 2: Validate output structure
# ---------------------------------------------------------------------------
echo ""
echo "=== Step 2/3: Validating output ==="

required_files=(
  "${OUTPUT_DIR}/config.json"
  "${OUTPUT_DIR}/tokenizer.json"
  "${OUTPUT_DIR}/preprocessor_config.json"
)

ok=true
for f in "${required_files[@]}"; do
  if [[ -f "$f" ]]; then
    echo "  ✓ $(basename "$f")"
  else
    echo "  ✗ MISSING: $f" >&2
    ok=false
  fi
done

# Check for ONNX model files (may be in onnx/ subdir or root)
onnx_count=$(find "${OUTPUT_DIR}" -name "*.onnx" | wc -l)
echo "  Found ${onnx_count} .onnx file(s)"

if [[ "${ok}" != "true" || "${onnx_count}" -eq 0 ]]; then
  echo "" >&2
  echo "ERROR: Validation failed. The output may be incomplete." >&2
  echo "Check the optimum-cli output above for errors." >&2
  exit 1
fi

echo "Validation passed."

# ---------------------------------------------------------------------------
# Step 3: Quantize (int8)
# ---------------------------------------------------------------------------
echo ""
echo "=== Step 3/3: Quantizing to int8 (q8) ==="
echo "Output: ${QUANTIZED_DIR}"

optimum-cli onnx quantize \
  --onnx_model "${OUTPUT_DIR}" \
  -o "${QUANTIZED_DIR}" \
  --per_channel

echo ""
echo "Quantization complete."
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "==========================================="
echo "  Conversion Summary"
echo "==========================================="
echo ""
echo "Full precision:  ${OUTPUT_DIR}"
du -sh "${OUTPUT_DIR}" 2>/dev/null || true
echo ""
echo "Quantized (q8):  ${QUANTIZED_DIR}"
du -sh "${QUANTIZED_DIR}" 2>/dev/null || true
echo ""

# ---------------------------------------------------------------------------
# Optional: Upload to HuggingFace
# ---------------------------------------------------------------------------
if [[ -n "${HF_USERNAME}" ]]; then
  REPO_ID="${HF_USERNAME}/${MODEL_SHORT}-${REPO_SUFFIX}"
  echo "=== Uploading to HuggingFace: ${REPO_ID} ==="
  echo ""

  # Upload quantized version (recommended for browser use)
  echo "Uploading quantized (q8) model..."
  huggingface-cli upload "${REPO_ID}" "${QUANTIZED_DIR}/" . \
    --repo-type model \
    --commit-message "Add ${MODEL_SHORT} ONNX (q8 quantized) for Transformers.js"

  echo ""
  echo "==========================================="
  echo "  Upload Complete!"
  echo "==========================================="
  echo ""
  echo "Repository: https://huggingface.co/${REPO_ID}"
  echo ""
  echo "Next step — update web/src/adapters/whisper-transformers.ts MODEL_MAP:"
  echo ""
  echo "  '${MODEL_SLUG}': '${REPO_ID}',"
  echo ""
else
  echo "To upload to HuggingFace, re-run with:"
  echo "  $0 --model ${MODEL_ID} --upload YOUR_HF_USERNAME"
  echo ""
  echo "Or upload manually:"
  echo "  huggingface-cli upload YOUR_USERNAME/${MODEL_SHORT}-${REPO_SUFFIX} ${QUANTIZED_DIR}/ . --repo-type model"
  echo ""
  echo "Then update web/src/adapters/whisper-transformers.ts MODEL_MAP:"
  echo "  '${MODEL_SLUG}': 'YOUR_USERNAME/${MODEL_SHORT}-${REPO_SUFFIX}',"
fi
