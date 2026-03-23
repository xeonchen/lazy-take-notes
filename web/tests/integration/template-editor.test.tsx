import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TemplateEditor } from '../../src/ui/components/TemplateEditor';
import type { SessionTemplate } from '../../src/entities/template';

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => cleanup());

const mockTemplate: SessionTemplate = {
  metadata: { key: 'test_en', name: 'Test Template', description: 'desc', locale: 'en' },
  systemPrompt: 'You are a test assistant.',
  digestUserTemplate: '{line_count} {new_lines} {user_context}',
  finalUserTemplate: '{full_transcript}',
  recognitionHints: ['hint1'],
  quickActions: [
    { label: 'Summarize', description: 'Quick summary', promptTemplate: '{digest_markdown}' },
  ],
  isUserTemplate: true,
};

describe('TemplateEditor', () => {
  it('renders all form sections', () => {
    render(<TemplateEditor template={mockTemplate} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Prompts')).toBeInTheDocument();
    expect(screen.getByText('Recognition Hints')).toBeInTheDocument();
    expect(screen.getByText(/Quick Actions/)).toBeInTheDocument();
  });

  it('pre-fills template name', () => {
    render(<TemplateEditor template={mockTemplate} onSave={vi.fn()} onCancel={vi.fn()} />);
    const nameInput = screen.getByDisplayValue('Test Template');
    expect(nameInput).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<TemplateEditor template={mockTemplate} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onSave with valid template', () => {
    const onSave = vi.fn();
    render(<TemplateEditor template={mockTemplate} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].metadata.name).toBe('Test Template');
  });

  it('shows validation errors for empty name', () => {
    const tmpl = {
      ...mockTemplate,
      metadata: { ...mockTemplate.metadata, name: '' },
    };
    render(<TemplateEditor template={tmpl} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Template name is required')).toBeInTheDocument();
  });

  it('shows validation errors for unknown format variables', () => {
    const tmpl = {
      ...mockTemplate,
      digestUserTemplate: '{bad_var}',
    };
    render(<TemplateEditor template={tmpl} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/unknown variable \{bad_var\}/)).toBeInTheDocument();
  });

  it('toggles between Edit and Preview tabs', () => {
    render(<TemplateEditor template={mockTemplate} onSave={vi.fn()} onCancel={vi.fn()} />);
    // Default is Edit tab — form fields visible
    expect(screen.getByText('Metadata')).toBeInTheDocument();

    // Switch to Preview
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    // Preview shows template name as heading
    expect(screen.getByText('Test Template')).toBeInTheDocument();
    // Form sections should not be visible
    expect(screen.queryByText('Metadata')).not.toBeInTheDocument();

    // Switch back to Edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  it('shows quick action editor with remove button', () => {
    render(<TemplateEditor template={mockTemplate} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue('Summarize')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('adds a quick action', () => {
    const tmpl = { ...mockTemplate, quickActions: [] };
    render(<TemplateEditor template={tmpl} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Quick Action' }));
    // Now there should be a Remove button for the new action
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});
