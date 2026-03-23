/**
 * L1 Entity — Session template schema.
 * Mirrors Python l1_entities.template.
 */

export interface TemplateMetadata {
  name: string;
  description: string;
  locale: string;
  key: string; // filename key, set by loader
}

export interface QuickAction {
  label: string;
  description: string;
  promptTemplate: string;
}

export interface SessionTemplate {
  metadata: TemplateMetadata;
  systemPrompt: string;
  digestUserTemplate: string;
  finalUserTemplate: string;
  recognitionHints: string[];
  quickActions: QuickAction[];
  /** True when the template was created/edited by the user (stored in IndexedDB). */
  isUserTemplate?: boolean;
}

// ── Allowed format variables per field ──────────────────────────────────────
// Mirrors Python l2_use_cases.utils.template_validator

const DIGEST_VARS = new Set(['line_count', 'new_lines', 'user_context']);
const FINAL_VARS = new Set(['line_count', 'new_lines', 'user_context', 'full_transcript']);
const QA_VARS = new Set(['digest_markdown', 'recent_transcript', 'user_context']);

/** Extract `{variable_name}` references from a Python-style format string. */
export function extractFormatVars(template: string): Set<string> {
  const vars = new Set<string>();
  // Match {word} but not {{ (escaped braces)
  const re = /(?<!\{)\{(\w+)\}(?!\})/g;
  let match;
  while ((match = re.exec(template)) !== null) {
    if (match[1] !== undefined) vars.add(match[1]);
  }
  return vars;
}

/** Check that a template string only uses allowed format variables. */
function checkFieldVars(
  fieldName: string,
  templateStr: string,
  allowed: Set<string>,
): string[] {
  if (!templateStr.trim()) return [];
  const used = extractFormatVars(templateStr);
  const errors: string[] = [];
  for (const v of used) {
    if (!allowed.has(v)) {
      const allowedList = [...allowed].sort().map((a) => `{${a}}`).join(', ');
      errors.push(`${fieldName} uses unknown variable {${v}}. Allowed: ${allowedList}`);
    }
  }
  return errors;
}

/**
 * Validate a SessionTemplate.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validateTemplate(t: SessionTemplate): string[] {
  const errors: string[] = [];

  if (t.quickActions.length > 5) {
    errors.push(`At most 5 quick_actions allowed, got ${t.quickActions.length}`);
  }
  if (!t.metadata.name.trim()) {
    errors.push('Template name is required');
  }
  if (!t.systemPrompt.trim()) {
    errors.push('system_prompt is required');
  }
  if (!t.digestUserTemplate.trim()) {
    errors.push('digest_user_template is required');
  }

  // Format variable validation
  errors.push(...checkFieldVars('digest_user_template', t.digestUserTemplate, DIGEST_VARS));
  errors.push(...checkFieldVars('final_user_template', t.finalUserTemplate, FINAL_VARS));

  for (const [i, qa] of t.quickActions.entries()) {
    if (!qa.label.trim()) {
      errors.push(`quick_actions[${i}]: label is required`);
    }
    if (!qa.promptTemplate.trim()) {
      errors.push(`quick_actions[${i}]: prompt_template is required`);
    }
    errors.push(...checkFieldVars(`quick_actions[${i}].prompt_template`, qa.promptTemplate, QA_VARS));
  }

  return errors;
}
