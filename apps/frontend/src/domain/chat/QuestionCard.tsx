import { useState } from 'react';
import type { QuestionCard as QuestionCardType } from './types';

interface Props {
  question: QuestionCardType;
  onSubmit: (answer: string) => void;
}

export function QuestionCard({ question, onSubmit }: Props) {
  const [answer, setAnswer] = useState('');

  function handleSubmit() {
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 my-2">
      <p className="font-medium text-yellow-800">🤔 Before I continue…</p>
      <p className="mt-2 text-sm text-yellow-900">{question.text}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="flex-1 rounded border border-yellow-300 px-3 py-1.5 text-sm bg-white"
          placeholder="Type your answer…"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="rounded bg-yellow-600 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-yellow-700"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
