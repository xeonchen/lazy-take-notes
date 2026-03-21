/**
 * Session Controller — orchestrates use cases, manages state.
 * Mirrors Python l3_interface_adapters.controllers.session_controller.
 */

import type { AppConfig } from '../entities/config';
import { DigestState } from '../entities/digest-state';
import type { SessionTemplate } from '../entities/template';
import type { DigestResult, TranscriptSegment } from '../entities/types';
import { CompactMessagesUseCase } from '../use-cases/compact';
import { RunDigestUseCase, shouldTriggerDigest } from '../use-cases/digest';
import type { LLMClient, PersistenceGateway, SessionData } from '../use-cases/ports';
import { RunQuickActionUseCase } from '../use-cases/quick-action';

export class SessionController {
  readonly digestState: DigestState;
  allSegments: TranscriptSegment[] = [];
  latestDigest: string | null = null;
  userContext = '';

  private digestUc: RunDigestUseCase;
  private compactUc: CompactMessagesUseCase;
  private quickActionUc: RunQuickActionUseCase;

  constructor(
    private config: AppConfig,
    private template: SessionTemplate,
    llmClient: LLMClient,
    private persistence: PersistenceGateway,
    private sessionId: string,
  ) {
    this.digestState = new DigestState();
    this.digestState.initMessages(template.systemPrompt);

    this.digestUc = new RunDigestUseCase(llmClient);
    this.compactUc = new CompactMessagesUseCase();
    this.quickActionUc = new RunQuickActionUseCase(llmClient);
  }

  /** Hot-swap the LLM client (e.g. after settings change). */
  updateLLMClient(llmClient: LLMClient): void {
    this.digestUc = new RunDigestUseCase(llmClient);
    this.quickActionUc = new RunQuickActionUseCase(llmClient);
  }

  /** Hot-swap the app config (e.g. after settings change). */
  updateConfig(config: AppConfig): void {
    this.config = config;
  }

  /** Process new transcript segments. Returns true if digest should trigger. */
  onTranscriptSegments(segments: TranscriptSegment[]): boolean {
    this.allSegments.push(...segments);
    for (const seg of segments) {
      this.digestState.buffer.push(seg.text);
      this.digestState.allLines.push(seg.text);
    }

    // Auto-persist
    this.persistSession();

    const dc = this.config.digest;
    return shouldTriggerDigest(
      this.digestState,
      dc.minLines,
      dc.minInterval,
      dc.maxLines,
    );
  }

  /** Run a digest cycle. */
  async runDigest(options: { isFinal?: boolean } = {}): Promise<DigestResult> {
    const { isFinal = false } = options;
    const fullTranscript = isFinal
      ? this.digestState.allLines.join('\n')
      : '';

    const result = await this.digestUc.execute(
      this.digestState,
      this.config.digest.model,
      this.template,
      { isFinal, fullTranscript, userContext: this.userContext },
    );

    if (result.data !== null) {
      this.latestDigest = result.data;

      // Compact if needed
      if (this.digestState.promptTokens > this.config.digest.compactTokenThreshold) {
        this.compactUc.execute(
          this.digestState,
          result.data,
          this.template.systemPrompt,
        );
      }

      this.persistSession();
    }

    return result;
  }

  /** Execute a quick action by key. Returns { result, label } or null. */
  async runQuickAction(key: string): Promise<{ result: string; label: string } | null> {
    return this.quickActionUc.execute(
      key,
      this.template,
      this.config.interactive.model,
      this.latestDigest,
      this.allSegments,
      { userContext: this.userContext },
    );
  }

  /** Persist current session state to IndexedDB. */
  private persistSession(): void {
    const data: SessionData = {
      id: this.sessionId,
      label: '',
      templateKey: this.template.metadata.key,
      createdAt: this.digestState.startTime * 1000,
      updatedAt: Date.now(),
      segments: this.allSegments,
      digestMarkdown: this.latestDigest || '',
      digestHistory: [],
      context: this.userContext,
    };
    // Fire-and-forget persistence
    this.persistence.saveSession(data).catch(() => {
      // Silently ignore persistence errors to not disrupt the session
    });
  }
}
