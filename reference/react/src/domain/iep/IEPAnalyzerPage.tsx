import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getIEPService } from "@/domain/iep/iep.service.ts";
import { getChildService } from "@/domain/child/child.service.ts";
import { PageHeader } from "@/app/ui/PageHeader.tsx";
import { AiInformationalDisclaimer } from "@/app/ui/AiInformationalDisclaimer.tsx";
import { useNotification } from "@/hooks/useNotification.tsx";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { logger } from "@/lib/logger.ts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { AlertTriangle } from "lucide-react";

import type { Child } from "@/domain/child/types.ts";

import { IEPAnalyzerProvider, useIEPAnalyzer } from "@/domain/iep/components/context/IEPAnalyzerContext.tsx";
import { FileUploadStep } from "@/domain/iep/components/FileUploadStep.tsx";

export function IEPAnalyzerPage() {
  return (
    <IEPAnalyzerProvider>
      <IEPAnalyzerWorkflow />
    </IEPAnalyzerProvider>
  );
}

interface DuplicatePending {
  formData: FormData;
  existingDocId: string;
  fileName: string;
  uploadedDate: string;
}

function IEPAnalyzerWorkflow() {
  const { childId, setChildId } = useIEPAnalyzer();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicatePending, setDuplicatePending] = useState<DuplicatePending | null>(null);

  const { accessToken } = useAuth();
  const { showError } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const loadChildren = async () => {
      try {
        const data = await getChildService().getAll(accessToken);
        setChildren(data);
        if (data.length === 1 && !childId) setChildId(data[0].id);
      } catch (err) {
        logger.error("Failed to load children", { err });
        showError("Failed to load children");
      }
    };
    loadChildren();
  }, []);


  /** Upload file to cloud and navigate to the dedicated analysis route */
  const handleStartAnalysis = async (file: File, cid: string) => {
    setIsProcessing(true);
    try {
      const service = getIEPService();
      const formData = new FormData();
      formData.append('childId', cid);
      formData.append('file', file);

      let docId: string;
      try {
        const { documentId } = await service.uploadDocument(formData);
        docId = documentId;
      } catch (uploadError: any) {
        if (uploadError?.message?.includes("DUPLICATE_DOCUMENT")) {
          // Try to extract existing doc info and confirm replacement
          const errordata = JSON.parse(uploadError.message);
          const existingDoc = errordata.details?.existingDocument;
          if (!existingDoc) throw uploadError;

          const uploadedDate = existingDoc.uploadDate
            ? new Date(existingDoc.uploadDate).toLocaleDateString()
            : 'unknown date';
          setDuplicatePending({
            formData,
            existingDocId: existingDoc.documentId,
            fileName: existingDoc.fileName,
            uploadedDate,
          });
          setIsProcessing(false);
          return;
        } else {
          throw uploadError;
        }
      }

      // Navigate to the dedicated analysis page — analysis runs there
      navigate(`/iep/analyse/${docId}`);
    } catch (error: unknown) {
      logger.error("Upload failed", { error });
      const msg = error instanceof Error ? error.message : "Upload failed. Please try again.";
      showError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Confirmed: delete duplicate and re-upload */
  const handleDuplicateConfirmed = async () => {
    if (!duplicatePending) return;
    const { formData, existingDocId } = duplicatePending;
    setDuplicatePending(null);
    setIsProcessing(true);
    try {
      const service = getIEPService();
      await service.delete(existingDocId);
      const { documentId } = await service.uploadDocument(formData);
      navigate(`/iep/analyse/${documentId}`);
    } catch (error: unknown) {
      logger.error("Replace upload failed", { error });
      const msg = error instanceof Error ? error.message : "Upload failed. Please try again.";
      showError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Navigate to the analysis page for an already-uploaded document, forcing a fresh AI run */
  const handleAnalyzeExisting = (docId: string, _cid: string) => {
    navigate(`/iep/analyse/${docId}?reanalyze=1`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="IEP Analysis" description="AI-powered IEP document extraction" />
      <AiInformationalDisclaimer scope="AI-generated IEP extraction, summary, and legal lens content" />

      <div className="max-w-5xl mx-auto">
        <FileUploadStep
          children={children}
          selectedFile={selectedFile}
          onFileChange={setSelectedFile}
          onNext={handleStartAnalysis}
          onAnalyzeExisting={handleAnalyzeExisting}
          isProcessing={isProcessing}
        />

        {/* ── Duplicate document confirmation dialog ── */}
        <Dialog open={!!duplicatePending} onOpenChange={(open) => { if (!open) setDuplicatePending(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Duplicate Document
              </DialogTitle>
              <DialogDescription className="space-y-1">
                <span>
                  A document <strong>&ldquo;{duplicatePending?.fileName}&rdquo;</strong> already exists for this child
                  {duplicatePending?.uploadedDate ? ` (uploaded ${duplicatePending.uploadedDate})` : ''}.
                </span>
                <br />
                <span>Delete the old version and upload this new document?</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDuplicatePending(null)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDuplicateConfirmed} disabled={isProcessing}>
                {isProcessing ? 'Uploading…' : 'Replace & Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
