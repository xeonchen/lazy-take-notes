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
}

/** Validate quick actions count (max 5). */
export function validateTemplate(t: SessionTemplate): string | null {
  if (t.quickActions.length > 5) {
    return `At most 5 quick_actions allowed, got ${t.quickActions.length}`;
  }
  if (!t.metadata.name) return 'Template name is required';
  if (!t.systemPrompt) return 'system_prompt is required';
  if (!t.digestUserTemplate) return 'digest_user_template is required';
  return null;
}
