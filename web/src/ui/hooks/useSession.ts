import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppConfig } from '../../entities/config';
import type { SessionTemplate } from '../../entities/template';
import type { DigestResult, TranscriptSegment } from '../../entities/types';
import { SessionController } from '../../controller/session-controller';
import type { LLMClient, PersistenceGateway } from '../../use-cases/ports';

interface SessionState {
  segments: TranscriptSegment[];
  digestMarkdown: string;
  isDigesting: boolean;
  isQuerying: boolean;
  digestError: string | null;
  queryResult: { result: string; label: string } | null;
  bufferCount: number;
}

export function useSession(
  config: AppConfig,
  template: SessionTemplate | null,
  llmClient: LLMClient | null,
  persistence: PersistenceGateway,
) {
  const [state, setState] = useState<SessionState>({
    segments: [],
    digestMarkdown: '',
    isDigesting: false,
    isQuerying: false,
    digestError: null,
    queryResult: null,
    bufferCount: 0,
  });

  const controllerRef = useRef<SessionController | null>(null);

  // Hot-swap LLM client when infraConfig changes mid-session
  useEffect(() => {
    if (controllerRef.current && llmClient) {
      controllerRef.current.updateLLMClient(llmClient);
    }
  }, [llmClient]);

  // Hot-swap app config when it changes mid-session
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig(config);
    }
  }, [config]);

  /** Initialize or reset the session. */
  const initSession = useCallback(() => {
    if (!template || !llmClient) return;
    const sessionId = `session-${Date.now()}`;
    const controller = new SessionController(config, template, llmClient, persistence, sessionId);
    controllerRef.current = controller;
    setState({
      segments: [],
      digestMarkdown: '',
      isDigesting: false,
      isQuerying: false,
      digestError: null,
      queryResult: null,
      bufferCount: 0,
    });
  }, [config, template, llmClient, persistence]);

  /** Run a digest cycle. Uses ref to avoid stale closure issues. */
  const runDigestRef = useRef<(isFinal: boolean) => Promise<void>>(async () => {});

  const runDigest = useCallback(
    async (isFinal: boolean) => {
      const controller = controllerRef.current;
      if (!controller) return;

      setState((s) => ({ ...s, isDigesting: true, digestError: null }));

      try {
        const result: DigestResult = await controller.runDigest({ isFinal });
        if (result.data !== null) {
          setState((s) => ({
            ...s,
            digestMarkdown: result.data ?? s.digestMarkdown,
            isDigesting: false,
            bufferCount: controller.digestState.buffer.length,
          }));
        } else {
          setState((s) => ({
            ...s,
            isDigesting: false,
            digestError: result.error,
          }));
        }
      } catch (e) {
        setState((s) => ({
          ...s,
          isDigesting: false,
          digestError: e instanceof Error ? e.message : String(e),
        }));
      }
    },
    [],
  );
  runDigestRef.current = runDigest;

  /** Feed transcript segments and check for digest trigger. */
  const onSegments = useCallback(
    async (segments: TranscriptSegment[]) => {
      const controller = controllerRef.current;
      if (!controller) return;

      const shouldDigest = controller.onTranscriptSegments(segments);

      setState((s) => ({
        ...s,
        segments: [...controller.allSegments],
        bufferCount: controller.digestState.buffer.length,
      }));

      if (shouldDigest) {
        await runDigestRef.current(false);
      }
    },
    [],
  );

  /** Run a quick action. */
  const runQuickAction = useCallback(
    async (key: string) => {
      const controller = controllerRef.current;
      if (!controller) return;

      setState((s) => ({ ...s, isQuerying: true, queryResult: null }));

      try {
        const result = await controller.runQuickAction(key);
        setState((s) => ({ ...s, isQuerying: false, queryResult: result }));
      } catch (e) {
        setState((s) => ({
          ...s,
          isQuerying: false,
          queryResult: {
            result: `Error: ${e instanceof Error ? e.message : String(e)}`,
            label: 'Error',
          },
        }));
      }
    },
    [],
  );

  /** Update user context. */
  const setUserContext = useCallback((context: string) => {
    if (controllerRef.current) {
      controllerRef.current.userContext = context;
    }
  }, []);

  /** Clear query result. */
  const clearQueryResult = useCallback(() => {
    setState((s) => ({ ...s, queryResult: null }));
  }, []);

  /** Reset all session state (for starting fresh). */
  const resetSession = useCallback(() => {
    controllerRef.current = null;
    setState({
      segments: [],
      digestMarkdown: '',
      isDigesting: false,
      isQuerying: false,
      digestError: null,
      queryResult: null,
      bufferCount: 0,
    });
  }, []);

  return {
    ...state,
    initSession,
    resetSession,
    onSegments,
    runDigest,
    runQuickAction,
    setUserContext,
    clearQueryResult,
  };
}
