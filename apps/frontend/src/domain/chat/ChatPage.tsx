import { useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getChatService } from './chat.service';
import { useChat } from './useChat';
import { useModels } from './useModels';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { WelcomeBanner } from './WelcomeBanner';
import { config } from '@/lib/config';

export function ChatPage() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessionIdRef = useRef<string>(paramSessionId ?? '');
  const initDoneRef = useRef(false);
  const { models, loading: modelsLoading } = useModels();

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
  const { messages, streaming, pendingQuestion, sendMessage, submitAnswer, loadHistory } = useChat(activeSessionId);

  // Load history when navigating to an existing session
  useEffect(() => {
    if (paramSessionId) {
      loadHistory(paramSessionId);
    }
  }, [paramSessionId, loadHistory]);

  function handleSend(text: string, model: string) {
    if (!activeSessionId) return;
    sendMessage(text, model);
  }

  function handlePromptClick(text: string) {
    handleSend(text, models[0]?.id ?? 'gpt-4.1');
  }

  const showOnboardBanner = !modelsLoading && models.length === 0;

  return (
    <div className="flex flex-col h-full">
      {showOnboardBanner && (
        <div className="mx-4 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <span className="text-yellow-800">No AI providers detected.</span>
          <Link
            to={config.routes.onboard}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Run Setup
          </Link>
        </div>
      )}
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
        models={models}
        defaultModel={models[0]?.id}
      />
    </div>
  );
}
