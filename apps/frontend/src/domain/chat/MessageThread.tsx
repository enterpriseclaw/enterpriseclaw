import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import type { Message, QuestionCard as QuestionCardType } from './types';

interface Props {
  messages: Message[];
  streaming: boolean;
  pendingQuestion: QuestionCardType | null;
  onSubmitAnswer: (questionId: string, answer: string) => void;
}

export function MessageThread({ messages, streaming, pendingQuestion, onSubmitAnswer }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={cn(
            'max-w-3xl',
            msg.role === 'user' ? 'ml-auto' : 'mr-auto'
          )}
        >
          {/* Tool chips */}
          {msg.toolChips && msg.toolChips.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {msg.toolChips.map((chip, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    chip.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : chip.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {chip.status === 'running' ? '⟳' : chip.status === 'done' ? '✔' : '✘'} {chip.tool}
                </span>
              ))}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              'rounded-lg px-4 py-2 text-sm whitespace-pre-wrap',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : msg.status === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-muted text-foreground'
            )}
          >
            {msg.content || (msg.status === 'streaming' ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-75">●</span>
                <span className="animate-bounce delay-150">●</span>
              </span>
            ) : null)}
          </div>
        </div>
      ))}

      {/* Pending question card */}
      {pendingQuestion && (
        <QuestionCard
          question={pendingQuestion}
          onSubmit={answer => onSubmitAnswer(pendingQuestion.questionId, answer)}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
