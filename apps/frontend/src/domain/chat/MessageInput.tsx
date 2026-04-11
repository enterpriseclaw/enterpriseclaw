import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvailableModel } from './useModels';

interface Props {
  onSend: (text: string, model: string) => void;
  disabled: boolean;
  models: AvailableModel[];
  defaultModel?: string;
}

export function MessageInput({ onSend, disabled, models, defaultModel }: Props) {
  const [text, setText] = useState('');
  const [model, setModel] = useState(defaultModel ?? models[0]?.id ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, model);
    setText('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 rounded-lg border bg-muted/30 flex flex-col">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'Waiting for response…' : 'Send a message… (Enter to send, Shift+Enter for newline)'}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none',
              'min-h-[44px] max-h-[200px]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={disabled || models.length === 0}
              className="text-xs bg-transparent text-muted-foreground border rounded px-1.5 py-0.5 cursor-pointer"
            >
              {models.length === 0 ? (
                <option disabled>Loading…</option>
              ) : (
                models.map(m => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))
              )}
            </select>
            <span className="text-xs text-muted-foreground">Shift+Enter for newline</span>
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={cn(
            'rounded-lg p-2.5 transition-colors',
            'bg-primary text-primary-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:bg-primary/90'
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
