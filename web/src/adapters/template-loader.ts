/**
 * L3 Adapter — Load YAML templates bundled with the app.
 */

import yaml from 'js-yaml';
import type { SessionTemplate, QuickAction } from '../entities/template';

// Vite raw imports for bundled YAML templates
const templateModules = import.meta.glob('../templates/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface RawTemplate {
  metadata?: {
    name?: string;
    description?: string;
    locale?: string;
  };
  system_prompt?: string;
  digest_user_template?: string;
  final_user_template?: string;
  recognition_hints?: string[];
  quick_actions?: Array<{
    label: string;
    description?: string;
    prompt_template: string;
  }>;
}

function parseTemplate(key: string, raw: RawTemplate): SessionTemplate {
  const meta = raw.metadata ?? {};
  return {
    metadata: {
      name: meta.name ?? key,
      description: meta.description ?? '',
      locale: meta.locale ?? 'en',
      key,
    },
    systemPrompt: raw.system_prompt ?? '',
    digestUserTemplate: raw.digest_user_template ?? '',
    finalUserTemplate: raw.final_user_template ?? '',
    recognitionHints: raw.recognition_hints ?? [],
    quickActions: (raw.quick_actions ?? []).slice(0, 5).map(
      (qa): QuickAction => ({
        label: qa.label,
        description: qa.description ?? '',
        promptTemplate: qa.prompt_template,
      }),
    ),
  };
}

/** Load all bundled templates. */
export function loadBundledTemplates(): SessionTemplate[] {
  const templates: SessionTemplate[] = [];

  for (const [path, content] of Object.entries(templateModules)) {
    // Extract key from path: ../templates/default_en.yaml → default_en
    const match = path.match(/\/([^/]+)\.yaml$/);
    const key = match?.[1] ?? path;

    try {
      const raw = yaml.load(content) as RawTemplate;
      templates.push(parseTemplate(key, raw));
    } catch {
      console.warn(`Failed to parse template: ${path}`);
    }
  }

  return templates.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
}

/** Load a specific template by key. */
export function loadTemplate(key: string): SessionTemplate | null {
  const all = loadBundledTemplates();
  return all.find((t) => t.metadata.key === key) ?? null;
}

/**
 * Merge bundled templates with user templates.
 * User templates with the same key override bundled ones.
 */
export function mergeTemplates(
  bundled: SessionTemplate[],
  userTemplates: SessionTemplate[],
): SessionTemplate[] {
  const map = new Map<string, SessionTemplate>();
  for (const t of bundled) {
    map.set(t.metadata.key, t);
  }
  for (const t of userTemplates) {
    map.set(t.metadata.key, { ...t, isUserTemplate: true });
  }
  return Array.from(map.values()).sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
}
