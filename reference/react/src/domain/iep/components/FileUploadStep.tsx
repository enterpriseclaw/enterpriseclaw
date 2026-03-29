import { useState, useEffect } from "react";
import { useIEPAnalyzer } from "./context/IEPAnalyzerContext.tsx";
import type { Child } from "@/domain/child/types.ts";
import type { DocumentListItem } from "@/domain/iep/types.ts";
import { getIEPService } from "@/domain/iep/iep.service.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Upload, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { logger } from "@/lib/logger.ts";

interface FileUploadStepProps {
  children: Child[];
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  /** Called when a NEW file should be uploaded+analyzed */
  onNext: (file: File, childId: string) => void;
  /** Called when an EXISTING document from storage should be re-analyzed */
  onAnalyzeExisting?: (documentId: string, childId: string) => void;
  isProcessing?: boolean;
}

const VALID_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/** Status helpers — handle both virtual analysisStatus and real status field */
const ANALYZED_VALUES = new Set(['completed', 'analyzed']);
const FAILED_VALUES = new Set(['failed', 'error']);
const isDocAnalyzed = (doc?: DocumentListItem) =>
  doc != null && (ANALYZED_VALUES.has(doc.analysisStatus as string) || ANALYZED_VALUES.has(doc.status as string));
const isDocFailed = (doc?: DocumentListItem) =>
  doc != null && (FAILED_VALUES.has(doc.analysisStatus as string) || FAILED_VALUES.has(doc.status as string));

/** Pure validation function */
const validateFile = (file: File): { valid: boolean; error?: string } => {
  const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!VALID_EXTENSIONS.includes(fileExt)) {
    return { valid: false, error: "Please upload PDF, DOC, DOCX, or TXT files only" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Maximum file size is 25MB" };
  }
  return { valid: true };
};

export function FileUploadStep({
  children,
  selectedFile,
  onFileChange,
  onNext,
  onAnalyzeExisting,
  isProcessing = false,
}: FileUploadStepProps) {
  const { childId, setChildId } = useIEPAnalyzer();
  const [isDragging, setIsDragging] = useState(false);
  const [existingDocs, setExistingDocs] = useState<DocumentListItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<string>("");

  // Load previously uploaded documents when child is selected
  useEffect(() => {
    if (!childId) {
      setExistingDocs([]);
      setSelectedExistingId("");
      return;
    }
    setIsLoadingDocs(true);
    getIEPService()
      .getAll(childId)
      .then((docs) => {
        setExistingDocs(docs as DocumentListItem[]);
      })
      .catch((err) => logger.error("Failed to load existing docs", { err }))
      .finally(() => setIsLoadingDocs(false));
  }, [childId]);

  const handleFileSelection = (file: File) => {
    const { valid, error } = validateFile(file);
    if (!valid) {
      alert(error);
      return;
    }
    onFileChange(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFileSelection(files[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Select Child and Document
        </CardTitle>
        <CardDescription>
          Upload a new IEP document or pick one already in storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Child selector */}
        <div className="space-y-2">
          <Label htmlFor="child-select">Select Child</Label>
          <Select value={childId} onValueChange={setChildId} disabled={isProcessing}>
            <SelectTrigger id="child-select">
              <SelectValue placeholder="Choose a child..." />
            </SelectTrigger>
            <SelectContent>
              {children.map(child => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload or select from storage tabs */}
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload New
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex-1" disabled={!childId}>
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              From Storage
            </TabsTrigger>
          </TabsList>

          {/* ── Upload new file ── */}
          <TabsContent value="upload" className="mt-4 space-y-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 transition-all text-center",
                isDragging ? "border-primary bg-primary/5 scale-105" : "border-muted-foreground/25 hover:border-primary",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileInput}
                disabled={isProcessing}
                className="hidden"
              />
              <label htmlFor="file-input" className={isProcessing ? "cursor-not-allowed" : "cursor-pointer"}>
                <Upload className={cn(
                  "mx-auto h-12 w-12 mb-2 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
                {selectedFile ? (
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT (max 25MB)</p>
                  </>
                )}
              </label>
            </div>
            <Button
              onClick={() => { if (selectedFile && childId) onNext(selectedFile, childId); }}
              disabled={!selectedFile || !childId || isProcessing}
              className="w-full"
            >
              Upload &amp; Analyse
            </Button>
          </TabsContent>

          {/* ── Select from storage ── */}
          <TabsContent value="storage" className="mt-4 space-y-3">
            {isLoadingDocs && (
              <p className="text-sm text-muted-foreground text-center py-4">Loading documents…</p>
            )}
            {!isLoadingDocs && existingDocs.length === 0 && childId && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No documents uploaded yet for this child.
              </p>
            )}
            {!isLoadingDocs && existingDocs.length > 0 && (
              <div className="rounded-md border divide-y">
                {existingDocs.map((doc) => (
                  <label
                    key={doc.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedExistingId === doc.id && "bg-primary/5"
                    )}
                  >
                    <input
                      type="radio"
                      name="existing-doc"
                      value={doc.id}
                      checked={selectedExistingId === doc.id}
                      onChange={() => setSelectedExistingId(doc.id)}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                        {doc.documentType && ` · ${doc.documentType}`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        isDocAnalyzed(doc) ? 'default'
                        : isDocFailed(doc) ? 'destructive'
                        : 'secondary'
                      }
                      className="shrink-0 text-xs"
                    >
                      {isDocAnalyzed(doc) ? 'Analyzed' : isDocFailed(doc) ? 'Failed' : 'Pending'}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
            <Button
              onClick={() => {
                if (selectedExistingId && childId && onAnalyzeExisting) {
                  onAnalyzeExisting(selectedExistingId, childId);
                }
              }}
              disabled={!selectedExistingId || !childId || !onAnalyzeExisting || isProcessing}
              className="w-full"
            >
              {selectedExistingId && isDocAnalyzed(existingDocs.find(d => d.id === selectedExistingId))
                ? 'Re-Analyse Selected Document'
                : 'Analyse Selected Document'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
