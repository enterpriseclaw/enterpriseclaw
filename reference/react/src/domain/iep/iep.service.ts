import { config } from "@/lib/config";
import { apiRequest, apiLongRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { 
  IEP, 
  CreateIEPData, 
  UpdateIEPData, 
  IEPAnalysisResult,
  ExtractionResponse,
  Correction,
  FinalizationResult,
  DocumentListItem,
} from "./types";
class IEPService {
  async getAll(childId?: string): Promise<IEP[]> {
    try {
      const url = childId
        ? `${config.api.endpoints.iep.list}?childId=${encodeURIComponent(childId)}`
        : config.api.endpoints.iep.list;
      const response = await apiRequest<{ documents: DocumentListItem[] }>(url, {
        method: "GET",
      });
      const ieps = response.documents || [];
      logger.debug("IEPs fetched", { childId, count: ieps.length });
      return ieps as IEP[];
    } catch (error) {
      logger.error("Error fetching IEPs", { childId, error });
      throw error;
    }
  }

  async getById(id: string): Promise<IEP> {
    try {
      const iep = await apiRequest<IEP>(config.api.endpoints.iep.get.replace(":id", id), {
        method: "GET",
      });
      logger.debug("IEP fetched", { id });
      return iep;
    } catch (error) {
      logger.error("Error fetching IEP", { id, error });
      throw error;
    }
  }

  async analyze(content: string): Promise<IEPAnalysisResult> {
    try {
      const result = await apiRequest<IEPAnalysisResult>(config.api.endpoints.iep.analyze, {
        method: "POST",
        body: { content },
      });
      logger.info("IEP analysis completed", { contentLength: content.length });
      return result;
    } catch (error) {
      logger.error("Error analyzing IEP", { error });
      throw error;
    }
  }

  async create(data: CreateIEPData): Promise<IEP> {
    try {
      const iep = await apiRequest<IEP>(config.api.endpoints.iep.create, {
        method: "POST",
        body: data,
      });
      logger.info("IEP created", { id: iep.id, childId: iep.childId });
      return iep;
    } catch (error) {
      logger.error("Error creating IEP", { error });
      throw error;
    }
  }

  async update(id: string, data: UpdateIEPData): Promise<IEP> {
    try {
      const updated = await apiRequest<IEP>(config.api.endpoints.iep.update.replace(":id", id), {
        method: "PATCH",
        body: data,
      });
      logger.info("IEP updated", { id });
      return updated;
    } catch (error) {
      logger.error("Error updating IEP", { id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await apiRequest<void>(config.api.endpoints.iep.delete.replace(":id", id), {
        method: "DELETE",
      });
      logger.info("IEP deleted", { id });
    } catch (error) {
      logger.error("Error deleting IEP", { id, error });
      throw error;
    }
  }

  // NEW: Upload document with multipart/form-data
  async uploadDocument(formData: FormData): Promise<{ documentId: string; fileName: string; status: string }> {
    try {
      // Note: Using fetch directly for FormData (apiRequest would JSON.stringify)
      const token = sessionStorage.getItem(config.sessionKey) 
        ? JSON.parse(sessionStorage.getItem(config.sessionKey)!).accessToken 
        : null;
      
      const response = await fetch(config.api.resolveUrl('/api/v1/iep/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(JSON.stringify(errorData));
      }

      const result = await response.json();
      logger.info("Document uploaded", { documentId: result.data?.documentId });
      return result.data;
    } catch (error) {
      logger.error("Error uploading document", { error });
      throw error;
    }
  }

  // NEW: Analyze document with streaming
  async analyzeDocument(
    documentId: string,
    onLog?: (log: { message: string; stage?: string }) => void,
    force = false
  ): Promise<void> {
    try {
      const url = force
        ? `/api/v1/iep/${documentId}/analyze-iep?force=1`
        : `/api/v1/iep/${documentId}/analyze-iep`;
      return await apiLongRequest(
        url,
        {
          method: 'GET',
          timeout: 300000, // 5 minutes
          onLog: onLog ? (event) => {
            onLog({ message: event.message, stage: event.stage });
          } : undefined,
        }
      );
    } catch (error) {
      logger.error("Error analyzing document", { documentId, error });
      throw error;
    }
  }

  /** Poll analysis status — used by IEPAnalysisPage to avoid re-running completed jobs */
  async getDocumentStatus(documentId: string): Promise<{
    analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
    extractionStatus: string | null;
    status: string;
    updatedAt: string;
  }> {
    try {
      const result = await apiRequest<{ success: boolean; data: any }>(
        `/api/v1/iep/${documentId}/status`,
        { method: 'GET' }
      );
      return result.data;
    } catch (error) {
      logger.error("Error fetching document status", { documentId, error });
      throw error;
    }
  }

  // NEW: Get extraction results
  async getExtraction(documentId: string): Promise<ExtractionResponse> {
    try {
      const result = await apiRequest<ExtractionResponse>(
        `/api/v1/iep/${documentId}/extraction`,
        {}
      );
      logger.debug("Extraction fetched", { documentId });
      return result;
    } catch (error) {
      logger.error("Error fetching extraction", { documentId, error });
      throw error;
    }
  }

  // NEW: Get document view (finalized IEP)
  async getDocumentView(documentId: string): Promise<ExtractionResponse> {
    try {
      const result = await apiRequest<ExtractionResponse>(
        `/api/documents/${documentId}/view`,
        {}
      );
      logger.debug("Document view fetched", { documentId });
      return result;
    } catch (error) {
      logger.error("Error fetching document view", { documentId, error });
      throw error;
    }
  }

  // NEW: Submit corrections
  async submitCorrections(
    documentId: string, 
    corrections: Correction[], 
    reviewCompleted: boolean
  ): Promise<void> {
    try {
      await apiRequest(
        `/api/v1/iep/${documentId}/corrections`,
        {
          method: 'POST',
          body: { corrections, reviewCompleted }
        }
      );
      logger.info("Corrections submitted", { documentId, count: corrections.length });
    } catch (error) {
      logger.error("Error submitting corrections", { documentId, error });
      throw error;
    }
  }

  // NEW: Check if can finalize
  async canFinalize(documentId: string): Promise<{ canFinalize: boolean; reason?: string }> {
    try {
      const result = await apiRequest<{ data: { canFinalize: boolean; reason?: string } }>(
        `/api/v1/iep/${documentId}/can-finalize`,
        {}
      );
      return result.data;
    } catch (error) {
      logger.error("Error checking finalization", { documentId, error });
      throw error;
    }
  }

  // NEW: Finalize document
  async finalizeDocument(documentId: string): Promise<FinalizationResult> {
    try {
      const result = await apiRequest<{ data: FinalizationResult }>(
        `/api/v1/iep/${documentId}/finalize`,
        { method: 'POST' }
      );
      logger.info("Document finalized", { documentId, result: result.data });
      return result.data;
    } catch (error) {
      logger.error("Error finalizing document", { documentId, error });
      throw error;
    }
  }

  // NEW: Delete all for child
  async deleteAllForChild(childId: string): Promise<{ deletedCount: number }> {
    try {
      const result = await apiRequest<{ data: { deletedCount: number } }>(
        `/api/v1/iep/child/${childId}/all`,
        { method: 'DELETE' }
      );
      logger.info("All documents deleted for child", { childId, count: result.data.deletedCount });
      return result.data;
    } catch (error) {
      logger.error("Error deleting all documents", { childId, error });
    }
  }

  // NEW: Get download URL for document
  async getDownloadUrl(documentId: string): Promise<string> {
    try {
      const result = await apiRequest<{ downloadUrl: string }>(
        `/api/v1/iep/${documentId}/download`,
        {}
      );
      logger.debug("Download URL retrieved", { documentId });
      return result.downloadUrl;
    } catch (error) {
      logger.error("Error getting download URL", { documentId, error });
      throw error;
    }
  }

  async downloadDocument(documentId: string, fileName: string): Promise<void> {
    try {
      const downloadUrl = await this.getDownloadUrl(documentId);

      const rawSession = sessionStorage.getItem(config.sessionKey);
      const token = rawSession ? JSON.parse(rawSession).accessToken : null;

      const isRelativeUrl = downloadUrl.startsWith("/");
      const requestUrl = isRelativeUrl ? config.api.resolveUrl(downloadUrl) : downloadUrl;
      const headers = isRelativeUrl && token ? { Authorization: `Bearer ${token}` } : undefined;

      const response = await fetch(requestUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || "Failed to download document");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || "Failed to download document");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      logger.error("Error downloading document", { documentId, error });
      throw error;
    }
  }
}

const iepServiceInstance = new IEPService();

export function getIEPService(): IEPService {
  return iepServiceInstance;
}
