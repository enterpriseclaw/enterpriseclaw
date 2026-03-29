import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Zap } from "lucide-react";
import { getQuickPrompts } from "@/domain/advocacy/advocacy.api.ts";

export function QuickPrompts({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  const [prompts, setPrompts] = useState<string[]>([]);

  const loadPrompts = async () => {
    const data = await getQuickPrompts();
    setPrompts(data);
  };

  useEffect(() => {
    (async () => {
      await loadPrompts();
    })();
  }, []);

  return (
    <div className="border-t bg-muted/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">PROMPTS</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onPromptClick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
