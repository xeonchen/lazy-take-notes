# Converting Whisper Models to ONNX for the Web App

The web app uses [Transformers.js](https://huggingface.co/docs/transformers.js) to run
Whisper-family speech recognition models in the browser via ONNX Runtime. Most official
Whisper models already have community ONNX conversions (under `onnx-community/`), but
some models — such as fine-tuned or regional variants — need manual conversion.

This guide walks through converting any Whisper-family model to a browser-ready ONNX
format, using **Breeze-ASR-25** as a concrete example.

## Prerequisites

```bash
pip install "optimum[onnxruntime]" onnxruntime huggingface_hub
```

- **Python 3.10+**
- **optimum**: Hugging Face's model optimization toolkit (provides `optimum-cli`)
- **onnxruntime**: ONNX inference engine (needed for quantization)
- **huggingface_hub**: CLI for uploading to HF Hub (only needed if uploading)

Authenticate with HuggingFace (one-time):

```bash
huggingface-cli login
```

## Quick Start (Breeze-ASR-25)

```bash
# Convert with defaults (Breeze-ASR-25)
bash scripts/convert-whisper-onnx.sh

# Convert and upload
bash scripts/convert-whisper-onnx.sh --upload YOUR_HF_USERNAME
```

## Converting Any Whisper Model

```bash
bash scripts/convert-whisper-onnx.sh --model ORG/MODEL_NAME
```

The script will:

1. **Export** the model to ONNX using `optimum-cli export onnx`
2. **Validate** the output structure (config, tokenizer, preprocessor, `.onnx` files)
3. **Quantize** to int8 (q8) for smaller download size in the browser
4. **Build upload directory** with Transformers.js-compatible layout (fp32 + `_quantized` suffix files in `onnx/` subdir)

### Script Options

| Flag | Description | Default |
|------|-------------|---------|
| `--model MODEL_ID` | HuggingFace model ID | `MediaTek-Research/Breeze-ASR-25` |
| `--output DIR` | Output directory | Auto-derived from model name |
| `--upload HF_USER` | Upload quantized model to HF Hub | _(skip upload)_ |
| `--repo-suffix` | HF repo name suffix | `ONNX` |

### Example: Converting a Custom Whisper Model

```bash
bash scripts/convert-whisper-onnx.sh \
  --model myorg/whisper-large-v3-ja \
  --upload myuser \
  --repo-suffix ONNX
# → Uploads to myuser/whisper-large-v3-ja-ONNX
```

## Adding the Converted Model to the Web App

After conversion and upload, register the model in the web app:

### 1. Add to `MODEL_MAP` in `web/src/adapters/whisper-transformers.ts`

```typescript
const MODEL_MAP: Record<WhisperModelName, ModelEntry> = {
  // ... existing models ...
  'your-model-slug': { repo: 'YOUR_USERNAME/Model-Name-ONNX' },
};
```

> **Note**: If your model was converted with an older version of the script that
> didn't produce `_quantized` suffix files, add `dtype: 'fp32'` to force loading
> the base-named ONNX files:
> ```typescript
> 'your-model-slug': { repo: 'YOUR_USERNAME/Model-Name-ONNX', dtype: 'fp32' },
> ```

### 2. Add to `AVAILABLE_WHISPER_MODELS` in `web/src/entities/config.ts`

```typescript
export const AVAILABLE_WHISPER_MODELS = [
  // ... existing models ...
  'your-model-slug',
] as const;
```

### 3. (Optional) Set as locale default in `web/src/entities/config.ts`

```typescript
export const DEFAULT_CONFIG: AppConfig = {
  models: {
    zh: 'your-model-slug',  // auto-select for Chinese locale
  },
  // ...
};
```

## Expected Output Structure

The conversion script builds a Transformers.js-compatible upload directory:

```
model-name-onnx-upload/           (ready to upload to HF Hub)
├── config.json
├── generation_config.json
├── preprocessor_config.json
├── tokenizer.json
├── tokenizer_config.json
└── onnx/
    ├── encoder_model.onnx                    (fp32 — used by WebGPU)
    ├── encoder_model_quantized.onnx          (q8  — used by WASM)
    ├── decoder_model.onnx                    (fp32)
    ├── decoder_model_quantized.onnx          (q8)
    ├── decoder_with_past_model.onnx          (fp32)
    └── decoder_with_past_model_quantized.onnx (q8)
```

Transformers.js resolves ONNX files by dtype:
- `dtype: 'fp32'` → loads base-named files (e.g. `encoder_model.onnx`)
- `dtype: 'q8'`   → loads `_quantized` suffix files (e.g. `encoder_model_quantized.onnx`)

## Troubleshooting

### `optimum-cli export` fails with "unsupported model type"

Not all model architectures are supported by Optimum's ONNX exporter. The model must be a
Whisper-family architecture (`WhisperForConditionalGeneration`). Fine-tuned variants that
preserve the architecture (like Breeze-ASR-25) work; models with custom architectures
may not.

### Quantized model produces garbled output

Int8 quantization can occasionally degrade accuracy for certain models. Try:
- Using the full-precision ONNX instead (upload the non-quantized version)
- Testing with `--per_channel` vs without (the script uses `--per_channel` by default)

### Upload fails with "401 Unauthorized"

Run `huggingface-cli login` and ensure your token has write access.

### Browser fails to load the model

- Verify all required files are present in the HF repo (see output structure above)
- Check browser console for CORS errors — HF Hub serves with correct CORS headers by default
- Large models (>500MB quantized) may cause OOM in the browser; consider using a smaller
  variant

### Model loads but produces no transcription output

- Check browser console for `[whisper]` log messages — they show model loading params
  (device, dtype) and transcription results
- If using WASM (`dtype: 'q8'`), verify the HF repo has `_quantized` suffix files.
  Models converted before the script update may only have base-named files — set
  `dtype: 'fp32'` in the MODEL_MAP entry as a workaround
- For Chinese models, verify the model's `generation_config.json` doesn't have
  `forced_decoder_ids` that force a different language
- Re-run the conversion script (updated version) to generate a Transformers.js-compatible
  upload directory with both fp32 and q8 files
