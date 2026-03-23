import { SafeMarkdown } from './SafeMarkdown';
import type { SessionTemplate } from '../../entities/template';

interface Props {
  template: SessionTemplate | null;
}

function truncate(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n') + '\n…';
}

/** Build a code fence that won't clash with backtick sequences in content. */
function codeFence(content: string): string {
  // Find the longest sequence of consecutive backticks in content
  let maxRun = 2;
  const matches = content.match(/`+/g);
  if (matches) {
    for (const m of matches) {
      if (m.length > maxRun) maxRun = m.length;
    }
  }
  const fence = '`'.repeat(maxRun + 1);
  return `${fence}\n${content}\n${fence}`;
}

export function TemplatePreview({ template }: Props) {
  if (!template) {
    return (
      <div className="template-preview-empty">
        <p>Select a template to preview</p>
      </div>
    );
  }

  const meta = template.metadata;
  const source = template.isUserTemplate ? '[user]' : '[built-in]';
  // F12 fix: escape user-controlled strings to prevent markdown injection
  const escapeMd = (s: string) => s.replace(/([#*_`~[\]<>\\|])/g, '\\$1');
  const safeName = escapeMd(meta.name || '(untitled)');
  const safeDesc = escapeMd(meta.description);
  const sections: string[] = [
    `# ${safeName}`,
    `*${source}*`,
    safeDesc ? `> ${safeDesc}` : '',
    `**Locale:** ${escapeMd(meta.locale)}`,
    '',
  ];

  if (template.quickActions.length > 0) {
    sections.push('### Quick Actions');
    template.quickActions.forEach((qa, i) => {
      sections.push(`${i + 1}. **${escapeMd(qa.label)}**${qa.description ? ` — ${escapeMd(qa.description)}` : ''}`);
    });
    sections.push('');
  }

  if (template.recognitionHints.length > 0) {
    sections.push('### Recognition Hints');
    sections.push(template.recognitionHints.map((h) => `\`${escapeMd(h)}\``).join(', '));
    sections.push('');
  }

  sections.push('### System Prompt');
  sections.push(codeFence(truncate(template.systemPrompt, 20)));
  sections.push('');

  sections.push('### Digest Template');
  sections.push(codeFence(truncate(template.digestUserTemplate, 10)));

  if (template.finalUserTemplate) {
    sections.push('');
    sections.push('### Final Template');
    sections.push(codeFence(truncate(template.finalUserTemplate, 10)));
  }

  return (
    <div className="template-preview">
      <SafeMarkdown>{sections.join('\n')}</SafeMarkdown>
    </div>
  );
}
