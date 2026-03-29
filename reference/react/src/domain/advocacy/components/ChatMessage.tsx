import { Button } from "@/components/ui/button.tsx";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer.tsx";
import { cn } from "@/lib/utils.ts";
import { Copy, Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: { id: string; role: 'assistant' | 'user'; content: string; timestamp: string | Date };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-purple-600" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-lg p-4",
          isAssistant ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isAssistant ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs opacity-70">{new Date(message.timestamp).toLocaleTimeString()}</span>
          {isAssistant && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => navigator.clipboard.writeText(message.content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
