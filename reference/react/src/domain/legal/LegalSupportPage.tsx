import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { LoadingState } from "@/app/ui/LoadingState.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { logger } from "@/lib/logger.ts";
import { getLegalService } from "@/domain/legal/legal.service.ts";
import type { LegalSupportMessage } from "@/domain/legal/types.ts";
import { Gavel, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { ChatMessage } from "./components/ChatMessage.tsx";
import { ChatInput } from "./components/ChatInput.tsx";
import { QuickPrompts } from "./components/QuickPrompts.tsx";

export function LegalSupportPage() {
  const { accessToken } = useAuth();
  const service = useMemo(() => getLegalService(), []);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LegalSupportMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let isMounted = true;
    const init = async () => {
      try {
        const session = await service.createSupportSession(accessToken);
        if (!isMounted) return;
        setSessionId(session.sessionId);
        setMessages(session.messages || []);
        logger.debug("Legal support session initialized", { sessionId: session.sessionId });
      } catch (err) {
        logger.error("Failed to create legal support session", { err });
        if (isMounted) setError("Could not start the legal support chat. Please try again.");
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [accessToken, service]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    if (!accessToken) throw new Error("Missing access token");
    const session = await service.createSupportSession(accessToken);
    setSessionId(session.sessionId);
    setMessages(session.messages || []);
    return session.sessionId;
  };

  const handleSendMessage = async (text: string) => {
    if (!accessToken) {
      setError("You need to be signed in to chat.");
      return;
    }
    const content = text.trim();
    if (!content || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const sid = await ensureSession();
      const userMsg: LegalSupportMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");

      const response = await service.sendSupportMessage(accessToken, sid, content);
      setSessionId(response.sessionId);
      setMessages(response.messages);
    } catch (err) {
      logger.error("Failed to send legal support message", { err });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I couldn't process that right now. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setError("Message failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const handleReset = async () => {
    if (!accessToken) return;
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsInitializing(true);
    try {
      const session = await service.createSupportSession(accessToken);
      setSessionId(session.sessionId);
      setMessages(session.messages || []);
    } catch (err) {
      logger.error("Failed to reset legal support session", { err });
      setError("Could not start a new chat. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  if (!accessToken) {
    return <LoadingState message="Please sign in to access legal support." />;
  }

  if (isInitializing) {
    return <LoadingState message="Starting your legal support chat..." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Gavel className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Legal Support Center</h1>
              <p className="text-sm text-muted-foreground">Navigate IDEA regulations and Special Education law</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary">AI Legal Consultant</Badge>
            <Button variant="ghost" size="icon" onClick={handleReset} disabled={isLoading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Common Hurdles */}
        <div className="w-80 border-r bg-background overflow-y-auto">
          <QuickPrompts onPromptClick={handlePromptClick} />
        </div>

        {/* Right Main Area - Chat */}
        <div className="flex-1 flex flex-col">
          {/* Legal Disclaimer */}
          <Alert className="mx-4 mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-sm">
              AskIEP Legal Support is AI-generated informational guidance about IDEA and related processes. It is not legal advice.
              Laws vary by state; consult a specialized attorney for specific legal issues.
            </AlertDescription>
          </Alert>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="max-w-md">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput 
            value={inputValue} 
            onChange={setInputValue} 
            onSend={() => handleSendMessage(inputValue)} 
            disabled={isLoading} 
          />
        </div>
      </div>
    </div>
  );
}
