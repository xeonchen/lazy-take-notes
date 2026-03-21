/**
 * Integration tests — render React components with @testing-library/react.
 * Verifies component rendering, interactions, and state management.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Without vitest globals, we need explicit cleanup between renders
afterEach(() => {
  cleanup();
});
import { TranscriptPanel } from '../../src/ui/components/TranscriptPanel';
import { DigestPanel } from '../../src/ui/components/DigestPanel';
import { ContextInput } from '../../src/ui/components/ContextInput';
import { StatusBar, type RecordingState } from '../../src/ui/components/StatusBar';
import { ConsentNotice } from '../../src/ui/components/ConsentNotice';
import { TemplateSelector } from '../../src/ui/components/TemplateSelector';
import { QueryModal } from '../../src/ui/components/QueryModal';
import { SettingsModal } from '../../src/ui/components/SettingsModal';
import { DEFAULT_APP_CONFIG, DEFAULT_INFRA_CONFIG, SUGGESTED_MODELS, MODEL_NAMES } from '../../src/entities/config';
import type { SessionTemplate } from '../../src/entities/template';

const mockTemplates: SessionTemplate[] = [
  {
    metadata: { name: 'Default (English)', description: 'General notes', locale: 'en', key: 'default_en' },
    systemPrompt: 'system',
    digestUserTemplate: '',
    finalUserTemplate: '',
    recognitionHints: [],
    quickActions: [
      { label: 'Summarize', description: 'Create a summary', promptTemplate: '{digest_markdown}' },
      { label: 'Action Items', description: 'List action items', promptTemplate: '{digest_markdown}' },
    ],
  },
  {
    metadata: { name: '預設 (繁體中文)', description: '通用筆記', locale: 'zh_tw', key: 'default_zh_tw' },
    systemPrompt: 'system',
    digestUserTemplate: '',
    finalUserTemplate: '',
    recognitionHints: [],
    quickActions: [],
  },
];

function defaultStatusBarProps(overrides: Partial<Parameters<typeof StatusBar>[0]> = {}): Parameters<typeof StatusBar>[0] {
  return {
    state: 'idle' as RecordingState,
    bufferCount: 0,
    bufferMax: 15,
    elapsedSeconds: 0,
    lastDigestAgo: null,

    levelHistory: [0, 0, 0, 0, 0, 0],
    isTranscribing: false,
    activity: '',
    downloadProgress: null,
    downloadModel: 'whisper-base',
    modeLabel: 'Record',
    quickActions: [],
    onQuickAction: vi.fn(),
    ...overrides,
  };
}

describe('TranscriptPanel', () => {
  it('shows waiting message when empty', () => {
    render(<TranscriptPanel segments={[]} />);
    expect(screen.getByText('Waiting for audio...')).toBeInTheDocument();
  });

  it('renders segments with text', () => {
    const segments = [
      { text: 'Hello world', wallStart: 1000, wallEnd: 1001 },
      { text: 'Second line', wallStart: 1002, wallEnd: 1003 },
    ];
    render(<TranscriptPanel segments={segments} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Second line')).toBeInTheDocument();
  });

  it('renders panel header', () => {
    render(<TranscriptPanel segments={[]} />);
    expect(screen.getByText('Transcript')).toBeInTheDocument();
  });
});

describe('DigestPanel', () => {
  it('shows placeholder when no markdown and not loading', () => {
    render(<DigestPanel markdown="" isLoading={false} />);
    expect(screen.getByText(/Notes will appear/)).toBeInTheDocument();
  });

  it('shows loading indicator when digesting', () => {
    render(<DigestPanel markdown="" isLoading={true} />);
    expect(screen.getByText('Digesting...')).toBeInTheDocument();
  });

  it('renders markdown content', () => {
    render(<DigestPanel markdown="# Title" isLoading={false} />);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
  });

  it('renders markdown with lists', () => {
    render(<DigestPanel markdown={'- item 1\n- item 2'} isLoading={false} />);
    expect(screen.getByText('item 1')).toBeInTheDocument();
    expect(screen.getByText('item 2')).toBeInTheDocument();
  });
});

describe('ContextInput', () => {
  it('renders textarea with value', () => {
    render(<ContextInput value="my context" onChange={vi.fn()} disabled={false} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('my context');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<ContextInput value="" onChange={onChange} disabled={false} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new text' } });
    expect(onChange).toHaveBeenCalledWith('new text');
  });

  it('is disabled when stopped', () => {
    render(<ContextInput value="" onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});

describe('StatusBar', () => {
  it('shows idle state', () => {
    render(<StatusBar {...defaultStatusBarProps()} />);
    expect(screen.getByText(/Idle/)).toBeInTheDocument();
    expect(screen.getByText('buf 0/15')).toBeInTheDocument();
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('shows recording state', () => {
    render(<StatusBar {...defaultStatusBarProps({ state: 'recording' })} />);
    expect(screen.getByText('● Rec')).toBeInTheDocument();
  });

  it('shows paused state', () => {
    render(<StatusBar {...defaultStatusBarProps({ state: 'paused' })} />);
    expect(screen.getByText(/Paused/)).toBeInTheDocument();
  });

  it('shows stopped state', () => {
    render(<StatusBar {...defaultStatusBarProps({ state: 'stopped' })} />);
    expect(screen.getByText(/Stopped/)).toBeInTheDocument();
  });

  it('shows buffer count', () => {
    render(<StatusBar {...defaultStatusBarProps({ bufferCount: 7, bufferMax: 15 })} />);
    expect(screen.getByText('buf 7/15')).toBeInTheDocument();
  });

  it('shows elapsed time formatted', () => {
    render(<StatusBar {...defaultStatusBarProps({ elapsedSeconds: 125 })} />);
    expect(screen.getByText('00:02:05')).toBeInTheDocument();
  });

  it('shows last digest ago', () => {
    render(<StatusBar {...defaultStatusBarProps({ lastDigestAgo: 45 })} />);
    expect(screen.getByText(/45s ago/)).toBeInTheDocument();
  });

  it('shows transcribing indicator', () => {
    render(<StatusBar {...defaultStatusBarProps({ isTranscribing: true })} />);
    expect(screen.getByText(/Transcribing/)).toBeInTheDocument();
  });

  it('shows activity text', () => {
    render(<StatusBar {...defaultStatusBarProps({ activity: 'Digesting...' })} />);
    expect(screen.getByText(/Digesting/)).toBeInTheDocument();
  });

  it('shows download progress', () => {
    render(<StatusBar {...defaultStatusBarProps({ downloadProgress: 42 })} />);
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    const onQA = vi.fn();
    render(
      <StatusBar
        {...defaultStatusBarProps({
          quickActions: [
            { label: 'Summarize', index: 0 },
            { label: 'Actions', index: 1 },
          ],
          onQuickAction: onQA,
        })}
      />,
    );

    const btn1 = screen.getByText('[1] Summarize');
    const btn2 = screen.getByText('[2] Actions');
    expect(btn1).toBeInTheDocument();
    expect(btn2).toBeInTheDocument();

    fireEvent.click(btn1);
    expect(onQA).toHaveBeenCalledWith('1');
  });

  it('shows mode label', () => {
    render(<StatusBar {...defaultStatusBarProps({ modeLabel: 'Record' })} />);
    expect(screen.getByText('Record')).toBeInTheDocument();
  });
});

describe('TemplateSelector', () => {
  it('renders template cards', () => {
    render(<TemplateSelector templates={mockTemplates} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText('Default (English)')).toBeInTheDocument();
    expect(screen.getByText('預設 (繁體中文)')).toBeInTheDocument();
  });

  it('shows template descriptions', () => {
    render(<TemplateSelector templates={mockTemplates} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText('General notes')).toBeInTheDocument();
    expect(screen.getByText('通用筆記')).toBeInTheDocument();
  });

  it('shows quick action count', () => {
    render(<TemplateSelector templates={mockTemplates} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText('2 quick actions')).toBeInTheDocument();
  });

  it('calls onSelect when clicking a card', () => {
    const onSelect = vi.fn();
    render(<TemplateSelector templates={mockTemplates} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Default (English)'));
    expect(onSelect).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('highlights selected template', () => {
    const { container } = render(
      <TemplateSelector templates={mockTemplates} selected="default_en" onSelect={vi.fn()} />,
    );
    const selectedCard = container.querySelector('.template-card.selected');
    expect(selectedCard).not.toBeNull();
  });
});

describe('ConsentNotice', () => {
  it('renders recording warning', () => {
    render(<ConsentNotice onDismiss={vi.fn()} onNeverShow={vi.fn()} />);
    expect(screen.getByText('Recording Notice')).toBeInTheDocument();
    expect(screen.getByText(/record audio/)).toBeInTheDocument();
  });

  it('calls onDismiss when clicking "I understand"', () => {
    const onDismiss = vi.fn();
    render(<ConsentNotice onDismiss={onDismiss} onNeverShow={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'I understand' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('calls onNeverShow when clicking "Don\'t show again"', () => {
    const onNeverShow = vi.fn();
    render(<ConsentNotice onDismiss={vi.fn()} onNeverShow={onNeverShow} />);
    fireEvent.click(screen.getByRole('button', { name: "Don't show again" }));
    expect(onNeverShow).toHaveBeenCalled();
  });
});

describe('QueryModal', () => {
  it('renders title and body', () => {
    render(
      <QueryModal title="Summarize" body="Here is the summary" isError={false} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Summarize')).toBeInTheDocument();
    expect(screen.getByText('Here is the summary')).toBeInTheDocument();
  });

  it('calls onClose when clicking close', () => {
    const onClose = vi.fn();
    render(
      <QueryModal title="Test" body="content" isError={false} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SettingsModal', () => {
  it('updates model names when switching provider to OpenAI', () => {
    const onSave = vi.fn();
    render(
      <SettingsModal
        appConfig={DEFAULT_APP_CONFIG}
        infraConfig={DEFAULT_INFRA_CONFIG}
        onSave={onSave}
        onTestConnection={vi.fn().mockResolvedValue({ ok: true, error: '' })}
        onClose={vi.fn()}
      />,
    );

    // Default provider is ollama
    const providerSelect = screen.getByDisplayValue('Ollama (local)');
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    // Click Save and verify model names were updated
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const [savedApp] = onSave.mock.calls[0]!;
    expect(savedApp.digest.model).toBe(SUGGESTED_MODELS.openai.digest);
    expect(savedApp.interactive.model).toBe(SUGGESTED_MODELS.openai.interactive);
  });

  it('updates model names when switching provider to Ollama', () => {
    const onSave = vi.fn();
    const openaiInfra = { ...DEFAULT_INFRA_CONFIG, llmProvider: 'openai' as const };
    const openaiApp = {
      ...DEFAULT_APP_CONFIG,
      digest: { ...DEFAULT_APP_CONFIG.digest, model: MODEL_NAMES.OPENAI_DEFAULT },
      interactive: { ...DEFAULT_APP_CONFIG.interactive, model: MODEL_NAMES.OPENAI_DEFAULT },
    };
    render(
      <SettingsModal
        appConfig={openaiApp}
        infraConfig={openaiInfra}
        onSave={onSave}
        onTestConnection={vi.fn().mockResolvedValue({ ok: true, error: '' })}
        onClose={vi.fn()}
      />,
    );

    const providerSelect = screen.getByDisplayValue('OpenAI / Compatible API');
    fireEvent.change(providerSelect, { target: { value: 'ollama' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const [savedApp] = onSave.mock.calls[0]!;
    expect(savedApp.digest.model).toBe(SUGGESTED_MODELS.ollama.digest);
    expect(savedApp.interactive.model).toBe(SUGGESTED_MODELS.ollama.interactive);
  });

  it('shows Getting Started header and banner when isFirstRun is true', () => {
    render(
      <SettingsModal
        appConfig={DEFAULT_APP_CONFIG}
        infraConfig={DEFAULT_INFRA_CONFIG}
        isFirstRun={true}
        onSave={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue({ ok: true, error: '' })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Welcome to lazy-take-notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    // No close (✕) button in first-run mode
    expect(screen.queryByText('✕')).not.toBeInTheDocument();
  });

  it('shows normal Settings header when isFirstRun is false', () => {
    render(
      <SettingsModal
        appConfig={DEFAULT_APP_CONFIG}
        infraConfig={DEFAULT_INFRA_CONFIG}
        onSave={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue({ ok: true, error: '' })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome to lazy-take-notes')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
