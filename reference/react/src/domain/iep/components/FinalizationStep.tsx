import { useIEPAnalyzer } from "./context/IEPAnalyzerContext.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { CheckCircle, FileCheck, Target, Settings, Bell } from "lucide-react";

interface FinalizationStepProps {
  onFinalize: () => void;
  onViewDocuments: () => void;
  isFinalizing: boolean;
}

export function FinalizationStep({
  onFinalize,
  onViewDocuments,
  isFinalizing,
}: FinalizationStepProps) {
  const { extractionData, isFinalized, finalResult, reset } = useIEPAnalyzer();

  if (isFinalized && finalResult) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle>Document Finalized Successfully!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{finalResult.goalsCreated}</p>
                <p className="text-sm text-muted-foreground">Goals Created</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{finalResult.servicesCreated}</p>
                <p className="text-sm text-muted-foreground">Services Created</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
              <Bell className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{finalResult.promptsCreated}</p>
                <p className="text-sm text-muted-foreground">Action Prompts</p>
              </div>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Extraction saved to the database.{finalResult.promptsCreated > 0 ? ` ${finalResult.promptsCreated} advocacy action prompt${finalResult.promptsCreated > 1 ? 's' : ''} generated from red flags — check your prompts panel.` : ''}
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button onClick={onViewDocuments} className="flex-1">
              View All Documents
            </Button>
            <Button variant="outline" onClick={reset}>
              Analyze Another Document
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const goalsCount = extractionData?.goals?.length || 0;
  const servicesCount = extractionData?.services?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Finalize Document
        </CardTitle>
        <CardDescription>
          Review the summary below and finalize to create goals and services in the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{goalsCount}</p>
              <p className="text-sm text-muted-foreground">Goals to Create</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{servicesCount}</p>
              <p className="text-sm text-muted-foreground">Services to Create</p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            This will create {goalsCount} goals and {servicesCount} services in the database. This action cannot be undone.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={onFinalize} 
          disabled={isFinalizing}
          className="w-full"
        >
          {isFinalizing ? "Finalizing..." : "Finalize Document"}
        </Button>
      </CardContent>
    </Card>
  );
}
