import { useState, useCallback, useRef } from 'react';
import { apiLongRequest } from '@/lib/http';
import { config } from '@/lib/config';
import { getChatService } from './chat.service';
import type { Message, ToolChip, QuestionCard, ChatEvent } from './types';

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<QuestionCard | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, model: string) => {
    setStreaming(true);
    abortRef.current = new AbortController();

    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }]);

    const asstMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: asstMsgId, role: 'assistant', content: '', status: 'streaming', toolChips: [] }]);

    try {
      for await (const event of apiLongRequest<ChatEvent>(
        config.api.endpoints.chat,
        { sessionId, message: text, model },
        abortRef.current.signal
      )) {
        switch (event.type) {
          case 'token':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, content: m.content + (event.text ?? '') } : m
            ));
            break;

          case 'tool_call':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId
                ? { ...m, toolChips: [...(m.toolChips ?? []), { tool: event.tool!, status: 'running' } as ToolChip] }
                : m
            ));
            break;

          case 'tool_done':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId
                ? {
                    ...m,
                    toolChips: m.toolChips?.map(c =>
                      c.tool === event.tool ? { ...c, status: 'done' as const } : c
                    ),
                  }
                : m
            ));
            break;

          case 'question':
            setPendingQuestion({
              questionId: event.questionId!,
              text: event.text!,
              answered: false,
            });
            setStreaming(false);
            return;

          case 'done':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, status: 'done' } : m
            ));
            setStreaming(false);
            break;

          case 'error':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, status: 'error', content: m.content || (event.message ?? 'Error') } : m
            ));
            setStreaming(false);
            break;
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === asstMsgId && m.status === 'streaming' ? { ...m, status: 'error' } : m
      ));
      setStreaming(false);
    }
  }, [sessionId]);

  const submitAnswer = useCallback(async (questionId: string, answer: string) => {
    const service = getChatService();
    await service.submitAnswer(sessionId, questionId, answer);
    setPendingQuestion(null);
  }, [sessionId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { messages, streaming, pendingQuestion, sendMessage, submitAnswer, abort, setPendingQuestion };
}
