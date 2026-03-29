import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { getIEPService } from "@/domain/iep/iep.service.ts";
import type { ExtractionResponse, ExtractedGoal, ExtractedService } from "@/domain/iep/types.ts";
import { PageHeader } from "@/app/ui/PageHeader.tsx";
import { AiInformationalDisclaimer } from "@/app/ui/AiInformationalDisclaimer.tsx";
import { LoadingState } from "@/app/ui/LoadingState.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { ArrowLeft, AlertTriangle, Info, CheckCircle2, XCircle, Calendar, Target as TargetIcon, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress.tsx";
import { useNotification } from "@/hooks/useNotification.tsx";
import { logger } from "@/lib/logger.ts";

const ConfidenceBadge = ({ score }: { score: number }) => {
  const variant = score >= 0.9 ? 'default' : score >= 0.7 ? 'secondary' : 'destructive';
  const label = score >= 0.9 ? 'High' : score >= 0.7 ? 'Medium' : 'Low';
  return <Badge variant={variant}>{label} ({Math.round(score * 100)}%)</Badge>;
};

export function IEPViewPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ExtractionResponse['data'] | null>(null);
  const [confidence, setConfidence] = useState<ExtractionResponse['data']['confidence'] | null>(null);

  const loadDocumentView = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const service = getIEPService();
      const response = await service.getDocumentView(id);
      setData(response.data);
      setConfidence(response.data.confidence);
      logger.debug("Document view loaded", { id });
    } catch (error) {
      logger.error("Error loading document view", { id, error });
      showError("Failed to load IEP document");
    } finally {
      setIsLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    if (!accessToken || !id) return;
    loadDocumentView();
  }, [accessToken, id, loadDocumentView]);

  const handleBack = () => {
    navigate('/iep/list');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <LoadingState message="Loading IEP document..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Document not found or no data available
          </CardContent>
        </Card>
        <div className="mt-4">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="IEP Document View"
        description={data.studentName ? `Viewing IEP for ${data.studentName}` : "Finalized IEP Document"}
        action={
          <div className="flex gap-2">
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </div>
        }
      />

      <div className="space-y-6 mt-6">
        <AiInformationalDisclaimer scope="AI-generated summary, red flags, and legal perspective" />

        {/* Summary and Red Flags Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary Card */}
          {data.summary && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Plain-Language Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{data.summary}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Red Flags Card */}
          {data.redFlags && data.redFlags.length > 0 && (
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-lg text-amber-900 dark:text-amber-100">
                    Advocacy Red Flags
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.redFlags.map((flag: string, i: number) => (
                    <li key={i} className="text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Legal Perspective Card */}
        {data.legalLens && (
          <Card className="bg-slate-900 dark:bg-slate-800 text-white border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <CardTitle className="text-lg">Legal Perspective</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-100 leading-relaxed">
                {data.legalLens}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <CardTitle>IEP Document Details</CardTitle>
            <CardDescription>
              Complete view of extracted IEP data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="goals">
                Goals ({data.goals?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="accommodations">
                Accommodations ({data.accommodations?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {data.goals?.length || 0}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Key Goals Extracted
                        </p>
                      </div>
                    </div>
                  </Card>

                  {data.services && data.services.length > 0 && (
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20">
                      <div className="flex items-center gap-3">
                        <Info className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {data.services.length}
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Services Identified
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {data.studentName && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Student Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Student Name</Label>
                        <p className="font-medium">{data.studentName}</p>
                      </div>
                      {data.studentDob && (
                        <div>
                          <Label className="text-muted-foreground">Date of Birth</Label>
                          <p className="font-medium">{new Date(data.studentDob).toLocaleDateString()}</p>
                        </div>
                      )}
                      {data.grade && (
                        <div>
                          <Label className="text-muted-foreground">Grade</Label>
                          <p className="font-medium">{data.grade}</p>
                        </div>
                      )}
                      {data.primaryDisability && (
                        <div>
                          <Label className="text-muted-foreground">Primary Disability</Label>
                          <p className="font-medium">{data.primaryDisability}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IEP Date Range */}
                {(data.iepStartDate || data.iepEndDate) && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">IEP Period</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {data.iepStartDate && (
                        <div>
                          <Label className="text-muted-foreground">Start Date</Label>
                          <p className="font-medium">{new Date(data.iepStartDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {data.iepEndDate && (
                        <div>
                          <Label className="text-muted-foreground">End Date</Label>
                          <p className="font-medium">{new Date(data.iepEndDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Goals Tab */}
              <TabsContent value="goals" className="space-y-4 mt-4">
                {!data.goals || data.goals.length === 0 ? (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>No goals identified</AlertTitle>
                    <AlertDescription>
                      No IEP goals were found in the document.
                    </AlertDescription>
                  </Alert>
                ) : (
                  data.goals.map((goal: ExtractedGoal, i: number) => {
                    // Compute timeline progress based on IEP period
                    const iepStart = data.iepStartDate ? new Date(data.iepStartDate) : null;
                    const iepEnd = data.iepEndDate ? new Date(data.iepEndDate) : null;
                    const goalStart = goal.startDate ? new Date(goal.startDate) : iepStart;
                    const now = new Date();

                    let timelinePct = 0;
                    let monthsElapsed = 0;
                    let monthsTotal = 0;
                    let timelineStatus: 'not-started' | 'on-track' | 'overdue' | 'completed' = 'not-started';

                    if (goalStart && iepEnd) {
                      const totalMs = iepEnd.getTime() - goalStart.getTime();
                      const elapsedMs = Math.min(now.getTime() - goalStart.getTime(), totalMs);
                      timelinePct = totalMs > 0 ? Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100)) : 0;
                      monthsTotal = Math.round(totalMs / (1000 * 60 * 60 * 24 * 30.44));
                      monthsElapsed = Math.round(Math.max(0, elapsedMs) / (1000 * 60 * 60 * 24 * 30.44));
                      if (now > iepEnd) timelineStatus = 'overdue';
                      else if (now < goalStart) timelineStatus = 'not-started';
                      else timelineStatus = 'on-track';
                    }

                    const statusColor = {
                      'not-started': 'bg-slate-100 text-slate-700',
                      'on-track': 'bg-green-100 text-green-800',
                      'overdue': 'bg-red-100 text-red-800',
                      'completed': 'bg-blue-100 text-blue-800',
                    }[timelineStatus];

                    const statusLabel = {
                      'not-started': 'Not Started',
                      'on-track': 'In Progress',
                      'overdue': 'Overdue',
                      'completed': 'Completed',
                    }[timelineStatus];

                    return (
                      <Card key={i} className="overflow-hidden">
                        {/* Goal header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                          <div className="flex items-center gap-2">
                            <TargetIcon className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">Goal {i + 1}</span>
                            {goal.domain && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {goal.domain.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                              {statusLabel}
                            </span>
                            {confidence?.goals && typeof confidence.goals === 'number' ? (
                              <ConfidenceBadge score={confidence.goals} />
                            ) : Array.isArray(confidence?.goals) && (confidence.goals as number[])[i] ? (
                              <ConfidenceBadge score={(confidence.goals as number[])[i]} />
                            ) : null}
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* Goal text */}
                          {(goal.goalText || goal.goalName) && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Goal Description</Label>
                              <p className="mt-1 text-sm leading-relaxed">{goal.goalText || goal.goalName}</p>
                            </div>
                          )}

                          {/* Timeline bar */}
                          {goalStart && iepEnd && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Start: {goalStart.toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {monthsElapsed} of {monthsTotal} months elapsed
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  End: {iepEnd.toLocaleDateString()}
                                </span>
                              </div>
                              <Progress
                                value={timelinePct}
                                className={timelineStatus === 'overdue' ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}
                              />
                              <p className="text-xs text-muted-foreground text-right">
                                {Math.round(timelinePct)}% of IEP period elapsed
                              </p>
                            </div>
                          )}

                          {/* Baseline → Target row */}
                          <div className="grid grid-cols-2 gap-4">
                            {goal.baseline && (
                              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 p-3">
                                <Label className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                  Baseline (Starting Point)
                                </Label>
                                <p className="mt-1 text-sm">{goal.baseline}</p>
                              </div>
                            )}
                            {goal.target && (
                              <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 p-3">
                                <Label className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wide">
                                  Target (End Goal)
                                </Label>
                                <p className="mt-1 text-sm">{goal.target}</p>
                              </div>
                            )}
                          </div>

                          {/* Criteria, measurement, frequency */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            {goal.criteria && (
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Success Criteria</Label>
                                <p className="mt-1">{goal.criteria}</p>
                              </div>
                            )}
                            {goal.measurementMethod && (
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">How Measured</Label>
                                <p className="mt-1">{goal.measurementMethod}</p>
                              </div>
                            )}
                            {goal.frequency && (
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Frequency</Label>
                                <p className="mt-1 capitalize">{goal.frequency}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Accommodations Tab */}
              <TabsContent value="accommodations" className="space-y-4 mt-4">
                {data.accommodations && data.accommodations.length > 0 ? (
                  <Card className="p-4">
                    <ul className="space-y-2">
                      {data.accommodations.map((acc: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{acc}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>No accommodations found in the document.</AlertDescription>
                  </Alert>
                )}

                {/* Modifications if present */}
                {data.modifications && data.modifications.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Modifications</h4>
                    <Card className="p-4">
                      <ul className="space-y-2">
                        {data.modifications.map((mod: string, i: number) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{mod}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Metadata Tab */}
              <TabsContent value="metadata" className="space-y-4 mt-4">
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.iepStartDate && (
                      <div>
                        <Label className="text-muted-foreground">IEP Start Date</Label>
                        <p className="font-medium">{new Date(data.iepStartDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {data.iepEndDate && (
                      <div>
                        <Label className="text-muted-foreground">IEP End Date</Label>
                        <p className="font-medium">{new Date(data.iepEndDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {data.iepMeetingDate && (
                      <div>
                        <Label className="text-muted-foreground">IEP Meeting Date</Label>
                        <p className="font-medium">{new Date(data.iepMeetingDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {data.schoolYear && (
                      <div>
                        <Label className="text-muted-foreground">School Year</Label>
                        <p className="font-medium">{data.schoolYear}</p>
                      </div>
                    )}
                    {data.grade && (
                      <div>
                        <Label className="text-muted-foreground">Grade</Label>
                        <p className="font-medium">{data.grade}</p>
                      </div>
                    )}
                    {data.studentName && (
                      <div>
                        <Label className="text-muted-foreground">Student Name</Label>
                        <p className="font-medium">{data.studentName}</p>
                      </div>
                    )}
                    {data.studentDob && (
                      <div>
                        <Label className="text-muted-foreground">Date of Birth</Label>
                        <p className="font-medium">{new Date(data.studentDob).toLocaleDateString()}</p>
                      </div>
                    )}
                    {data.primaryDisability && (
                      <div>
                        <Label className="text-muted-foreground">Primary Disability</Label>
                        <p className="font-medium">{data.primaryDisability}</p>
                      </div>
                    )}
                    {confidence && (
                      <div className="col-span-full pt-4 border-t">
                        <Label className="text-muted-foreground">Overall Extraction Confidence</Label>
                        <div className="mt-1">
                          <ConfidenceBadge score={confidence.overall || 0} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Services if present */}
                {data.services && data.services.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-3">Services</h4>
                    {data.services.map((service: ExtractedService, i: number) => (
                      <Card key={i} className="p-4 mb-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <Label className="text-muted-foreground">Service Type</Label>
                            <p className="font-medium">{service.serviceType || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Provider</Label>
                            <p className="font-medium">{service.provider || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Frequency</Label>
                            <p className="font-medium">{service.frequency || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Duration</Label>
                            <p className="font-medium">{service.duration || 'N/A'}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
