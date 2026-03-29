import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { useIEPAnalyzer } from "./context/IEPAnalyzerContext.tsx";
import { AlertCircle, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function AnalysisProgressStep() {
  const { logs, progress } = useIEPAnalyzer();
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Start a 1-second interval to track elapsed time
  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const patienceMessage =
    elapsed >= 90
      ? "AI extraction of dense PDF documents typically takes 2–5 minutes. Please keep this tab open."
      : elapsed >= 30
      ? "AI analysis in progress — this may take up to 3 minutes for longer documents."
      : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 animate-pulse text-primary" />
          Document Analysis in Progress
          <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Clock className="h-4 w-4" />
            {elapsedLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />

        {patienceMessage && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
            ⏳ {patienceMessage}
          </p>
        )}
        
        <div className="rounded-md border bg-muted/50 p-4">
          <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">Waiting for logs...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="text-foreground">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
