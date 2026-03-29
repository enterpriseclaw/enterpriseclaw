import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { getIEPService } from "@/domain/iep/iep.service.ts";
import type { IEP, DocumentListItem, ExtractionResponse, Correction } from "@/domain/iep/types.ts";
import { getChildService } from "@/domain/child/child.service.ts";
import type { Child } from "@/domain/child/types.ts";
import { PageHeader } from "@/app/ui/PageHeader.tsx";
import { LoadingState } from "@/app/ui/LoadingState.tsx";
import { EmptyState } from "@/app/ui/EmptyState.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Plus, FileSearch, Edit, Trash2, Eye, CheckCircle, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { useNotification } from "@/hooks/useNotification.tsx";
import { logger } from "@/lib/logger.ts";
import { config } from "@/lib/config.ts";
import { cn } from "@/lib/utils.ts";

const ConfidenceBadge = ({ score }: { score: number }) => {
  const variant = score >= 0.9 ? 'default' : score >= 0.7 ? 'secondary' : 'destructive';
  const label = score >= 0.9 ? 'High' : score >= 0.7 ? 'Medium' : 'Low';
  return <Badge variant={variant}>{label} ({Math.round(score * 100)}%)</Badge>;
};

export function IEPListPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useNotification();
  const [ieps, setIeps] = useState<DocumentListItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [finalizeConfirmId, setFinalizeConfirmId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentListItem | null>(null);
  const [detailExtraction, setDetailExtraction] = useState<ExtractionResponse['data'] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Extraction review dialog state
  const [showExtraction, setShowExtraction] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [extractionData, setExtractionData] = useState<ExtractionResponse['data'] | null>(null);
  const [confidence, setConfidence] = useState<any>(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [isLoadingExtraction, setIsLoadingExtraction] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    loadDocuments();
  }, [accessToken]);

  // Auto-open extraction dialog if documentId in URL
  useEffect(() => {
    const reviewDocId = searchParams.get('review');
    if (reviewDocId && ieps.length > 0 && !showExtraction) {
      // Check if document exists and is analyzed
      const doc = ieps.find(d => d.id === reviewDocId);
      if (doc && doc.status === 'analyzed') {
        handleViewExtraction(reviewDocId);
        // Remove query param after opening
        setSearchParams({});
      }
    }
  }, [searchParams, ieps, showExtraction]);

  const loadDocuments = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const iepService = getIEPService();
      const childService = getChildService();
      const [data, kids] = await Promise.all([
        iepService.getAll(),
        childService.getAll(accessToken),
      ]);
      setIeps(data as DocumentListItem[]);
      setChildren(kids);
      logger.debug("IEPs loaded", { count: data.length, children: kids.length });
    } catch (error) {
      logger.error("Error loading IEPs", { error });
      showError("Failed to load IEPs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeleteConfirmId(null);
    setDeletingId(id);
    try {
      const service = getIEPService();
      await service.delete(id);
      setIeps((prev) => prev.filter((i) => i.id !== id));
      showSuccess("Document deleted");
    } catch (error) {
      logger.error("Delete IEP failed", { id, error });
      showError("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewExtraction = async (docId: string) => {
    if (!accessToken) return;
    setCurrentDocId(docId);
    setShowExtraction(true);
    setIsLoadingExtraction(true);
    setCorrections([]);
    setReviewCompleted(false);
    
    try {
      const service = getIEPService();
      const response = await service.getExtraction(docId);
      setExtractionData(response.data);
      setConfidence(response.data.confidence);
      setLowConfidenceFields([]);
    } catch (error) {
      logger.error("Error fetching extraction", { docId, error });
      showError("Failed to load extraction data");
      setShowExtraction(false);
    } finally {
      setIsLoadingExtraction(false);
    }
  };

  const handleFieldCorrection = (field: string, originalValue: any, newValue: any) => {
    setCorrections(prev => {
      const existing = prev.findIndex(c => c.field === field);
      const correction: Correction = {
        field,
        originalValue,
        correctedValue: newValue,
        reason: "User correction"
      };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = correction;
        return updated;
      }
      return [...prev, correction];
    });
  };

  const handleSubmitCorrections = async () => {
    if (!accessToken || !currentDocId) return;
    
    try {
      const service = getIEPService();
      await service.submitCorrections(currentDocId, corrections, reviewCompleted);
      showSuccess("Corrections submitted");
      setShowExtraction(false);
      loadDocuments(); // Reload to update status
    } catch (error) {
      logger.error("Error submitting corrections", { error });
      showError("Failed to submit corrections");
    }
  };

  const handleFinalize = async (docId: string) => {
    if (!accessToken) return;
    setFinalizeConfirmId(docId);
  };

  const confirmFinalize = async () => {
    const docId = finalizeConfirmId;
    if (!docId) return;
    setFinalizeConfirmId(null);
    setIsFinalizing(true);
    try {
      const service = getIEPService();
      const result = await service.finalizeDocument(docId);
      showSuccess(
        "Document Finalized",
        `Created ${result.goalsCreated} goals, ${result.servicesCreated} services`
      );
      loadDocuments();
    } catch (error) {
      logger.error("Error finalizing document", { docId, error });
      showError("Failed to finalize document");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const service = getIEPService();
      await service.downloadDocument(docId, fileName);
      showSuccess("Download started");
    } catch (error) {
      logger.error("Error downloading document", { docId, error });
      showError("Failed to download document");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      uploaded: 'secondary',
      processing: 'outline',
      analyzed: 'default',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  };

  const openDetails = (doc: DocumentListItem) => {
    setSelectedDoc(doc);
    setDetailsOpen(true);
    setDetailExtraction(null);
    loadDetailExtraction(doc.id);
  };

  const loadDetailExtraction = async (docId: string) => {
    if (!accessToken) return;
    setIsLoadingDetails(true);
    try {
      const service = getIEPService();
      const response = await service.getExtraction(docId);
      setDetailExtraction(response.data);
    } catch (error) {
      logger.error("Error fetching extraction preview", { docId, error });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading documents..." />;

  if (ieps.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title="IEP Documents"
          description="Upload and manage IEP documents"
          action={
            <Button onClick={() => navigate(config.routes.iepAnalyzer)}>
              <FileSearch className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          }
        />
        <EmptyState
          icon={FileSearch}
          title="The repository is currently empty"
          description="Upload your first IEP document to get started with AI analysis."
          action={
            <Button onClick={() => navigate(config.routes.iepAnalyzer)}> 
              <Plus className="mr-2 h-4 w-4" />
              Analyze your first IEP
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Document Repository"
        description="Secure historical storage for all IEP versions"
        action={
          <div className="flex gap-2">

            <Button onClick={() => navigate(config.routes.iepAnalyzer)}>
              <Plus className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Documents</CardTitle>
            <p className="text-sm text-muted-foreground">Sorted by newest upload</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {ieps.length} record{ieps.length !== 1 ? 's' : ''} securely stored
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            {ieps
              .slice()
              .sort((a, b) => new Date(b.uploadDate || '').getTime() - new Date(a.uploadDate || '').getTime())
              .map((iep) => {
                const child = children.find((c) => c.id === iep.childId);
                const isAnalyzed = iep.status === 'analyzed';
                return (
                  <Card key={iep.id} className="border border-border/70 bg-muted/30">
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                            <FileSearch className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">
                              {iep.originalFileName || iep.fileName || 'Untitled'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {formatDate(iep.uploadDate)} • {child?.name || 'Unknown child'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(iep.status)}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-md bg-background p-3">
                          <p className="text-xs text-muted-foreground">Upload Date</p>
                          <p className="font-medium">{formatDate(iep.uploadDate)}</p>
                        </div>
                        <div className="rounded-md bg-background p-3">
                          <p className="text-xs text-muted-foreground">Child</p>
                          <p className="font-medium">{child?.name || 'Unknown'}</p>
                        </div>
                        <div className="rounded-md bg-background p-3">
                          <p className="text-xs text-muted-foreground">Document ID</p>
                          <p className="font-mono text-xs text-muted-foreground">{iep.id}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/iep/analyse/${iep.id}`)}
                          title="View analysis / document details"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                        
                        {/* Analyze button for not-yet-analyzed or failed docs */}
                        {!isAnalyzed && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => navigate(`/iep/analyse/${iep.id}?reanalyze=1`)}
                            title="Analyze this document with AI"
                          >
                            <FileSearch className="mr-1 h-4 w-4" />
                            Analyze
                          </Button>
                        )}
                        {isAnalyzed && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/iep/analyse/${iep.id}?reanalyze=1`)}
                              title="Re-analyze this document with AI"
                            >
                              <RefreshCw className="mr-1 h-4 w-4" />
                              Re-Analyze
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(iep.id)}
                          disabled={deletingId === iep.id}
                          title="Delete Document"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedDoc(null);
            setDetailExtraction(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-xl flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>{selectedDoc?.originalFileName || selectedDoc?.fileName || 'Document details'}</SheetTitle>
            <SheetDescription>
              Secure IEP document record with audit-friendly metadata.
            </SheetDescription>
          </SheetHeader>

          {selectedDoc ? (
            <div className="mt-4 space-y-3 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Child</p>
                  <p className="font-medium">
                    {children.find((c) => c.id === selectedDoc.childId)?.name || 'Unknown'}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Upload Date</p>
                  <p className="font-medium">{formatDate(selectedDoc.uploadDate)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {getStatusBadge(selectedDoc.status)}
              </div>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Document ID</p>
                <p className="font-mono text-xs text-muted-foreground break-all">{selectedDoc.id}</p>
              </div>

              <div className="space-y-3">
                {isLoadingDetails && (
                  <div className="text-sm text-muted-foreground">Loading analysis preview...</div>
                )}

                {!isLoadingDetails && detailExtraction?.summary && (
                  <Card className="border bg-background/60">
                    <CardHeader>
                      <CardTitle className="text-base">Plain-Language Summary</CardTitle>
                      <CardDescription>{detailExtraction.summary}</CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {!isLoadingDetails && detailExtraction?.redFlags?.length ? (
                  <Card className="border bg-amber-50/70 dark:bg-amber-950/30">
                    <CardHeader>
                      <CardTitle className="text-base text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        Advocacy Red Flags
                      </CardTitle>
                      <CardDescription className="text-amber-900 dark:text-amber-100">
                        Items that may need attention.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detailExtraction.redFlags.map((flag, idx) => (
                        <div key={idx} className="flex gap-2 text-sm text-amber-900 dark:text-amber-100">
                          <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                          <span>{flag}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                {!isLoadingDetails && detailExtraction?.legalLens && (
                  <Card className="border bg-slate-50/70 dark:bg-slate-900/50">
                    <CardHeader>
                      <CardTitle className="text-base">Legal Perspective</CardTitle>
                      <CardDescription>{detailExtraction.legalLens}</CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {!isLoadingDetails && !detailExtraction?.summary && (
                  <div className="text-sm text-muted-foreground">
                    No analysis preview available yet. Try “View Analysis”.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">Select a document to view details.</div>
          )}

          <SheetFooter className="mt-6 flex-col sm:flex-row gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                if (selectedDoc) {
                  handleDownload(
                    selectedDoc.id,
                    selectedDoc.originalFileName || selectedDoc.fileName || 'document'
                  );
                }
              }}
              disabled={!selectedDoc}
            >
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Extraction Review Dialog */}
      <Dialog open={showExtraction} onOpenChange={setShowExtraction}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Edit Extracted Data</DialogTitle>
            <DialogDescription>
              Review the AI-extracted data, make corrections if needed, then finalize to create goals and services
            </DialogDescription>
          </DialogHeader>

          {isLoadingExtraction ? (
            <div className="py-8 text-center text-muted-foreground">Loading extraction data...</div>
          ) : extractionData ? (
            <Tabs defaultValue="metadata" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="metadata">
                  Metadata
                  {lowConfidenceFields.some(f => f.startsWith('metadata')) && (
                    <AlertTriangle className="ml-2 h-3 w-3 text-yellow-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="goals">
                  Goals ({extractionData.goals?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="services">
                  Services ({extractionData.services?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="space-y-4">
                {[
                  ['Student Name', extractionData.studentName],
                  ['Date of Birth', extractionData.studentDob],
                  ['Grade', extractionData.grade],
                  ['School Year', extractionData.schoolYear],
                  ['IEP Start Date', extractionData.iepStartDate],
                  ['IEP End Date', extractionData.iepEndDate],
                  ['IEP Meeting Date', extractionData.iepMeetingDate],
                  ['Primary Disability', extractionData.primaryDisability]
                ].map(([label, value]) => {
                  const key = label.toLowerCase().replace(/\s+/g, '');
                  const confidenceScore = confidence?.metadata?.[key] || 1;
                  const isLowConfidence = confidenceScore < 0.7;
                  return (
                    <div 
                      key={key}
                      className={cn(
                        "space-y-2 p-3 rounded-md",
                        isLowConfidence && "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{label}</Label>
                        <ConfidenceBadge score={confidenceScore} />
                      </div>
                      <Input 
                        value={Array.isArray(value) ? value.join(', ') : (value || '')}
                        onChange={(e) => handleFieldCorrection(`metadata.${key}`, value, e.target.value)}
                        placeholder={`Enter ${key}`}
                      />
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="goals" className="space-y-4">
                {extractionData.goals?.map((goal, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Goal {i + 1}</h4>
                        {confidence?.goals?.[i] && (
                          <ConfidenceBadge score={confidence.goals[i]} />
                        )}
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <Label>Domain</Label>
                          <Input value={goal.domain || ''} disabled />
                        </div>
                        <div>
                          <Label>Goal Name</Label>
                          <Input value={goal.goalName || ''} disabled />
                        </div>
                        <div>
                          <Label>Baseline</Label>
                          <Input value={goal.baseline || ''} disabled />
                        </div>
                        <div>
                          <Label>Target</Label>
                          <Input value={goal.target || ''} disabled />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                {extractionData.services?.map((service, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Service {i + 1}</h4>
                        {confidence?.services?.[i] && (
                          <ConfidenceBadge score={confidence.services[i]} />
                        )}
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <Label>Service Type</Label>
                          <Input value={service.serviceType || ''} disabled />
                        </div>
                        <div>
                          <Label>Provider</Label>
                          <Input value={service.provider || ''} disabled />
                        </div>
                        <div>
                          <Label>Frequency</Label>
                          <Input value={service.frequency || ''} disabled />
                        </div>
                        <div>
                          <Label>Minutes per Session</Label>
                          <Input value={service.minutesPerSession?.toString() || ''} disabled />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No extraction data available</div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="review-completed" 
                checked={reviewCompleted}
                onCheckedChange={(checked) => setReviewCompleted(checked as boolean)}
              />
              <label
                htmlFor="review-completed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have reviewed all extracted data
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExtraction(false)}>
                Close
              </Button>
              {corrections.length > 0 && (
                <Button 
                  onClick={handleSubmitCorrections}
                  disabled={!reviewCompleted || isLoadingExtraction}
                  variant="secondary"
                >
                  Submit Corrections
                </Button>
              )}
              {currentDocId && reviewCompleted && (
                <Button 
                  onClick={() => {
                    setShowExtraction(false);
                    handleFinalize(currentDocId);
                  }}
                  disabled={isFinalizing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalize Document
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this IEP document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Finalize confirmation dialog ── */}
      <Dialog open={!!finalizeConfirmId} onOpenChange={(open) => { if (!open) setFinalizeConfirmId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Finalize Document
            </DialogTitle>
            <DialogDescription>
              This will extract goals and services from the IEP and save them to the database. You can review them afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFinalizeConfirmId(null)}>
              Cancel
            </Button>
            <Button onClick={confirmFinalize} disabled={isFinalizing}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
