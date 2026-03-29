import { useEffect, useRef, useState } from "react";
import { MessageSquare, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { AiInformationalDisclaimer } from "@/app/ui/AiInformationalDisclaimer.tsx";
import { ChatMessage } from "./components/ChatMessage.tsx";
import { QuickPrompts } from "./components/QuickPrompts.tsx";
import { ChatInput } from "./components/ChatInput.tsx";
import {
  createSession,
  sendSessionMessage,
  deleteSession,
} from "@/domain/advocacy/advocacy.api.ts";
import { useNotification } from "@/hooks/useNotification.tsx";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { getChildService } from "@/domain/child/child.service.ts";
import { logger } from "@/lib/logger";
import type { Child } from "@/domain/child/types.ts";
interface ChatMessageModel {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export function AdvocacyLabPage() {
  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { showError } = useNotification();
  const { accessToken } = useAuth();

  const createMessageId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  // Load children once on mount
  useEffect(() => {
    if (!accessToken) return;
    getChildService()
      .getAll(accessToken)
      .then((data) => {
        setChildren(data);
        if (data.length === 1) setSelectedChildId(data[0].id);
      })
      .catch((err) => logger.error('Failed to load children', { err }));
  }, [accessToken]);

  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    setIsLoading(true);
    try {
      const session = await createSession('iep_meeting', 'Refine Legal Negotiation', selectedChildId || undefined);
      setSessionId(session.id);
      if (session.messages?.length) {
        setMessages(
          session.messages.map((m) => ({
            id: createMessageId(),
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        );
      } else {
        // if no initial message provided, add a simple intro
        setMessages([
          {
            id: createMessageId(),
            role: 'assistant',
            content: "Hello! I'm your Advocacy Lab coach. Let's practice an IEP meeting. Start by telling me your concern or pick a prompt.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      logger.error('Failed to initialize session', { err });
      showError('Failed to initialize session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!sessionId) return;

    const userMsg: ChatMessageModel = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await sendSessionMessage(sessionId, text);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: response.role,
          content: response.content,
          timestamp: response.timestamp,
        },
      ]);
    } catch (err) {
      logger.error('Failed to send session message', { err });
      showError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const handleReset = async () => {
    if (sessionId) {
      try {
        await deleteSession(sessionId);
      } catch (err) {
        logger.debug('Delete session error (ignored)', { err });
      }
    }
    setMessages([]);
    setSessionId(null);
    await initializeSession();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* AI disclaimer */}
      <div className="px-4 pt-3">
        <AiInformationalDisclaimer scope="Advocacy Lab simulations are AI-generated practice scenarios" />
      </div>
      <div className="border-b bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Advocacy Lab</h1>
              <p className="text-sm text-muted-foreground">Practice Rehearsal: School Team Meeting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {children.length > 0 && (
              <Select
                value={selectedChildId || "__none__"}
                onValueChange={(val) => {
                  setSelectedChildId(val === "__none__" ? "" : val);
                }}
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Select child (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No child context</SelectItem>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Badge variant="outline" className="text-primary">Goal: Refine Legal Negotiation</Badge>
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

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

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <QuickPrompts onPromptClick={handlePromptClick} />

      {/* Input Area */}
      <ChatInput value={inputValue} onChange={setInputValue} onSend={() => handleSendMessage(inputValue)} disabled={isLoading} />
    </div>
  );
}
