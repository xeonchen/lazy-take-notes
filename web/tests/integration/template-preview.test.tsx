import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => cleanup());
import { TemplatePreview } from '../../src/ui/components/TemplatePreview';
import type { SessionTemplate } from '../../src/entities/template';

const mockTemplate: SessionTemplate = {
  metadata: { key: 'test_en', name: 'Test Template', description: 'A test description', locale: 'en' },
  systemPrompt: 'You are a test assistant.\nLine 2.',
  digestUserTemplate: 'Transcript ({line_count} lines):\n{new_lines}',
  finalUserTemplate: 'Final: {full_transcript}',
  recognitionHints: ['keyword1', 'keyword2'],
  quickActions: [
    { label: 'Summarize', description: 'Quick summary', promptTemplate: '{digest_markdown}' },
  ],
};

describe('TemplatePreview', () => {
  it('shows empty state when template is null', () => {
    render(<TemplatePreview template={null} />);
    expect(screen.getByText('Select a template to preview')).toBeInTheDocument();
  });

  it('renders template name', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText(/A test description/)).toBeInTheDocument();
  });

  it('renders quick actions', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders recognition hints', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText(/keyword1/)).toBeInTheDocument();
    expect(screen.getByText(/keyword2/)).toBeInTheDocument();
  });

  it('renders system prompt section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('System Prompt')).toBeInTheDocument();
    expect(screen.getByText(/You are a test assistant/)).toBeInTheDocument();
  });

  it('shows built-in badge for bundled templates', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText(/built-in/)).toBeInTheDocument();
  });

  it('shows user badge for user templates', () => {
    render(<TemplatePreview template={{ ...mockTemplate, isUserTemplate: true }} />);
    expect(screen.getByText(/user/)).toBeInTheDocument();
  });
});
