import { AlertTriangle } from 'lucide-react';

interface AiInformationalDisclaimerProps {
  scope?: string;
}

export function AiInformationalDisclaimer({
  scope = 'AI-generated output',
}: AiInformationalDisclaimerProps) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-sm leading-snug">
        {scope} is informational only and not legal advice. Verify critical conclusions with qualified professionals.
      </p>
    </div>
  );
}
