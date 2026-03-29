import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getIEPService } from "@/domain/iep/iep.service.ts";
import { PageHeader } from "@/app/ui/PageHeader.tsx";
import { AiInformationalDisclaimer } from "@/app/ui/AiInformationalDisclaimer.tsx";
import { useNotification } from "@/hooks/useNotification.tsx";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { logger } from "@/lib/logger.ts";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { CheckCircle, Target, Settings, Bell, ArrowLeft, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

import { IEPAnalyzerProvider, useIEPAnalyzer } from "@/domain/iep/components/context/IEPAnalyzerContext.tsx";
import { AnalysisProgressStep } from "@/domain/iep/components/AnalysisProgressStep.tsx";
import { ExtractionReviewStep } from "@/domain/iep/components/ExtractionReviewStep.tsx";

export function IEPAnalysisPage() {
  return (
    <IEPAnalyzerProvider>
      <IEPAnalysisWorkflow />
    </IEPAnalyzerProvider>
  );
}

type Phase = 'checking' | 'analyzing' | 'polling' | 'result' | 'failed';

const POLL_INTERVAL_MS = 3000;

function IEPAnalysisWorkflow() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceReanalyze = searchParams.get('reanalyze') === '1';
  const { accessToken } = useAuth();
  const { showSuccess } = useNotification();

  const {
    documentId: contextDocId,
    addLog, setProgress, setStage,
    setExtraction, setFinalized, setDocumentInfo, clearLast,
    finalResult, isFinalized,
  } = useIEPAnalyzer();

  const [phase, setPhase] = useState<Phase>(() => {
    // If sessionStorage already has a finalized result for this exact doc, skip everything
    if (contextDocId === docId && isFinalized && finalResult) return 'result';
    return 'checking';
  });

  const [failureReason, setFailureReason] = useState<string>('');
  const hasInitialized = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── Load extraction + finalize after AI is done ─────────────────────────
  const loadAndFinalize = useCallback(async (id: string, skipFinalize = false) => {
    try {
      addLog("Loading extracted data...");
      const response = await getIEPService().getExtraction(id);
      setExtraction(response.data);

      if (skipFinalize) {
        // Doc is already finalized — build result counts from extraction data
        const goals = response.data?.goals ?? [];
        const services = response.data?.services ?? [];
        setFinalized({
          goalsCreated: goals.length,
          servicesCreated: services.length,
          promptsCreated: 0,
          goals,
          services: response.data?.services ?? [],
        });
        addLog(`✓ Loaded ${goals.length} goals from existing analysis`);
        setPhase('result');
        return;
      }

      addLog("Auto-finalizing document...");
      setStage("Finalizing...");
      const result = await getIEPService().finalizeDocument(id);
      setFinalized(result);
      addLog(`✓ Created ${result.goalsCreated} goals successfully!`);
      showSuccess(`Document finalized! Created ${result.goalsCreated} goals.`);
      setPhase('result');
    } catch (err) {
      logger.error("Failed to finalize document", { err });
      const msg = err instanceof Error ? err.message : "Failed to process document";
      setFailureReason(msg);
      setPhase('failed');
    }
  }, [addLog, setExtraction, setFinalized, setStage, showSuccess]);

  // ── Stream analysis via NDJSON ───────────────────────────────────────────
  const runAnalysis = useCallback(async (id: string, force = false) => {
    clearLast();
    setDocumentInfo(id, '');
    setStage("Starting analysis...");
    setProgress(5);
    setPhase('analyzing');

    try {
      const service = getIEPService();
      addLog(force ? "Starting fresh AI re-analysis..." : "Starting AI analysis...");

      await service.analyzeDocument(id, (log) => {
        addLog(log.message);
        if (log.stage) {
          setStage(log.stage);
          const stageProgress: Record<string, number> = {
            init: 10, preparing: 30,
            'ai-analysis': 55, saving: 90, complete: 100,
          };
          setProgress(stageProgress[log.stage] ?? 0);
        }
      }, force);

      setProgress(100);
      setStage("Complete!");
      await loadAndFinalize(id);
    } catch (error: unknown) {
      logger.error("Analysis failed", { error });
      const msg = error instanceof Error ? error.message : "Analysis failed. Please try again.";
      setFailureReason(msg);
      setPhase('failed');
    }
  }, [addLog, clearLast, loadAndFinalize, setDocumentInfo, setProgress, setStage]);

  // ── Poll until backend reports completed/failed ──────────────────────────
  const startPolling = useCallback((id: string) => {
    setPhase('polling');
    stopPolling();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusData = await getIEPService().getDocumentStatus(id);
        if (statusData.analysisStatus === 'completed') {
          stopPolling();
          await loadAndFinalize(id, true);
        } else if (statusData.analysisStatus === 'failed') {
          stopPolling();
          setFailureReason("The server-side analysis failed. Please retry.");
          setPhase('failed');
        }
        // 'in_progress' / 'pending' — keep polling
      } catch (err) {
        logger.error("Polling status check failed", { err });
        // Don't stop polling on transient network errors
      }
    }, POLL_INTERVAL_MS);
  }, [loadAndFinalize, stopPolling]);

  // ── Initialization effect — runs once per docId ──────────────────────────
  useEffect(() => {
    if (!docId || !accessToken) return;

    // Fast-path: already have a finalized result in sessionStorage for this doc
    // Skip if reanalyze=1 was requested — always run fresh
    if (!forceReanalyze && contextDocId === docId && isFinalized && finalResult) {
      setPhase('result');
      return;
    }

    // Guard against double-fire in React StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      // reanalyze=1 — skip DB status check and go straight to fresh AI run
      if (forceReanalyze) {
        await runAnalysis(docId, true);
        return;
      }

      try {
        const statusData = await getIEPService().getDocumentStatus(docId);

        switch (statusData.analysisStatus) {
          case 'completed':
            // Result exists in DB — fetch and display, skip Gemini + finalize calls
            await loadAndFinalize(docId, true);
            break;

          case 'in_progress':
            // Another process is running — poll until done
            startPolling(docId);
            break;

          case 'failed':
            setFailureReason("A previous analysis attempt failed. Click Retry to try again.");
            setPhase('failed');
            break;

          default:
            // 'pending' or any unrecognised value — kick off fresh analysis
            await runAnalysis(docId);
        }
      } catch (err) {
        logger.error("Status check failed — falling back to analysis", { err });
        // If status endpoint fails, try running analysis anyway
        await runAnalysis(docId);
      }
    };

    init();

    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, accessToken]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Page header with breadcrumb-style back nav ── */}
      <div className="space-y-1">
        <PageHeader
          title="IEP Analysis"
          description="AI-powered IEP document extraction"
        />
      </div>
      {/* Disclaimer — hidden in result phase since ExtractionReviewStep renders its own */}
      {phase !== 'result' && (
        <AiInformationalDisclaimer scope="AI-generated IEP extraction, summary, and legal lens content" />
      )}

      <div className="max-w-5xl mx-auto">

        {/* ── Checking DB status ── */}
        {phase === 'checking' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking analysis status…</p>
          </div>
        )}

        {/* ── Active NDJSON stream ── */}
        {phase === 'analyzing' && <AnalysisProgressStep />}

        {/* ── Polling — another process is running ── */}
        {phase === 'polling' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="font-medium">Analysis in progress…</p>
            <p className="text-sm text-muted-foreground">
              This document is being analyzed. Checking for results every {POLL_INTERVAL_MS / 1000} seconds.
            </p>
          </div>
        )}

        {/* ── Failed ── */}
        {phase === 'failed' && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Analysis Failed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {failureReason && (
                <Alert variant="destructive">
                  <AlertDescription>{failureReason}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => { if (docId) runAnalysis(docId, true); }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Analysis
                </Button>
                <Button variant="outline" onClick={() => navigate('/iep/analyse')}>
                  Upload Different Document
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Result ── */}
        {phase === 'result' && isFinalized && finalResult && (
          <div className="space-y-6">
            <ExtractionReviewStep isLoading={false} onNext={() => {}} />

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
                    <Settings className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{finalResult.servicesCreated}</p>
                      <p className="text-sm text-muted-foreground">Services Created</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                    <Bell className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="text-2xl font-bold">{finalResult.promptsCreated ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Action Prompts</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Extraction saved to the database.
                    {(finalResult.promptsCreated ?? 0) > 0
                      ? ` ${finalResult.promptsCreated} advocacy action prompt${finalResult.promptsCreated > 1 ? 's' : ''} generated from red flags — check your prompts panel.`
                      : ' You can now view and manage the created goals.'}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button onClick={() => navigate('/iep/list')} className="flex-1">
                    View All IEP Documents
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/iep/analyse')}>
                    Analyze Another Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
