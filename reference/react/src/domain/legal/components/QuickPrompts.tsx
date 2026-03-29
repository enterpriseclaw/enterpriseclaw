import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Target, Sparkles } from "lucide-react";

const commonHurdles = [
  { title: "What is FAPE?", subtitle: "Define Free Appropriate Public Education" },
  { title: "Requesting an IEE", subtitle: "Independent Educational Evaluation rights" },
  { title: "Stay Put Rights", subtitle: "Keeping placement during disputes" },
  { title: "10-Day Notice", subtitle: "Rules for private placement reimbursement" },
  { title: "Prior Written Notice", subtitle: "When must the school provide PWN?" },
  { title: "Manifestation Determination", subtitle: "Discipline protection rules" },
];

const advocacyTip = "The goal is not to win an argument, but to secure the services your child needs for a FAPE.";

export function QuickPrompts({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="p-4 space-y-4">
      {/* Common Hurdles Header */}
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Target className="h-4 w-4" />
        Common Hurdles
      </div>

      {/* Hurdles Cards */}
      <div className="space-y-2">
        {commonHurdles.map((hurdle, i) => (
          <button
            key={i}
            onClick={() => onPromptClick(hurdle.title)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-3 text-left shadow-sm transition hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{hurdle.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hurdle.subtitle}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Advocacy Tip */}
      <Card className="bg-slate-900 dark:bg-slate-950 text-white shadow-sm mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Advocacy Tip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-100 italic">"{advocacyTip}"</p>
        </CardContent>
      </Card>
    </div>
  );
}
