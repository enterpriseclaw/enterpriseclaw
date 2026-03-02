import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChatService } from './chat.service';
import { useChat } from './useChat';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { WelcomeBanner } from './WelcomeBanner';
import { config } from '@/lib/config';

export function ChatPage() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessionIdRef = useRef<string>(paramSessionId ?? '');
  const initDoneRef = useRef(false);

  // If no sessionId in URL, create one
  useEffect(() => {
    if (paramSessionId || initDoneRef.current) return;
    initDoneRef.current = true;
    getChatService()
      .createSession()
      .then(session => {
        sessionIdRef.current = session.sessionId;
        navigate(config.routes.chatSession(session.sessionId), { replace: true });
      });
  }, [paramSessionId, navigate]);

  const activeSessionId = paramSessionId ?? sessionIdRef.current;
  const { messages, streaming, pendingQuestion, sendMessage, submitAnswer } = useChat(activeSessionId);

  function handleSend(text: string, model: string) {
    if (!activeSessionId) return;
    sendMessage(text, model);
  }

  function handlePromptClick(text: string) {
    handleSend(text, 'gpt-4o');
  }

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 && !streaming ? (
        <WelcomeBanner onPromptClick={handlePromptClick} />
      ) : (
        <MessageThread
          messages={messages}
          streaming={streaming}
          pendingQuestion={pendingQuestion}
          onSubmitAnswer={(questionId, answer) => submitAnswer(questionId, answer)}
        />
      )}
      <MessageInput
        onSend={handleSend}
        disabled={streaming || pendingQuestion !== null}
      />
    </div>
  );
}
