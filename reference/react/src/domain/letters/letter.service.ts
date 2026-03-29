import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { Letter, CreateLetterData, UpdateLetterData } from "./types";

export interface LetterService {
  getAll(token: string): Promise<Letter[]>;
  getById(token: string, id: string): Promise<Letter>;
  create(token: string, data: CreateLetterData): Promise<Letter>;
  update(token: string, id: string, data: UpdateLetterData): Promise<Letter>;
  delete(token: string, id: string): Promise<void>;
}

class LetterServiceImpl implements LetterService {
  async getAll(token: string): Promise<Letter[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ letters: Letter[] } | Letter[]>(config.api.endpoints.letters.list, {
        method: "GET",
        token,
      });
      // Handle both response formats
      const letters = Array.isArray(response) ? response : (response as any).letters || [];
      // Enhance each letter with frontend fields
      const enhancedLetters = letters.map(letter => this.enhanceLetterWithFrontendFields(letter));
      enhancedLetters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      logger.debug("Letters fetched", { count: enhancedLetters.length });
      return enhancedLetters;
    } catch (error) {
      logger.error("Error fetching letters", { error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<Letter> {
    if (!token) throw new Error("Missing access token");
    try {
      const letter = await apiRequest<Letter>(config.api.endpoints.letters.get?.replace(":id", id) || `${config.api.endpoints.letters.list}/${id}`, {
        method: "GET",
        token,
      });
      logger.debug("Letter fetched", { id, type: letter.letterType });
      return this.enhanceLetterWithFrontendFields(letter);
    } catch (error) {
      logger.error("Error fetching letter", { id, error });
      throw error;
    }
  }

  async create(token: string, data: CreateLetterData): Promise<Letter> {
    if (!token) throw new Error("Missing access token");
    try {
      // Map frontend fields to backend fields
      const backendData = {
        childId: data.childId,
        letterType: this.mapLetterTypeToBackend(data.letterType || 'other'),
        title: data.title || data.subject || 'Untitled Letter',
        content: data.content,
        contentHtml: data.contentHtml,
        generationContext: data.generationContext || {
          recipient: data.recipient,
          category: data.category,
        },
      };
      
      const letter = await apiRequest<Letter>(config.api.endpoints.letters.generate ?? config.api.endpoints.letters.list, {
        method: "POST",
        token,
        body: backendData,
      });
      logger.info("Letter created", { id: letter.id, type: letter.letterType });
      return this.enhanceLetterWithFrontendFields(letter);
    } catch (error) {
      logger.error("Error creating letter", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: UpdateLetterData): Promise<Letter> {
    if (!token) throw new Error("Missing access token");
    try {
      // Map frontend fields to backend fields
      const backendData: any = {};
      if (data.childId) backendData.childId = data.childId;
      if (data.letterType) backendData.letterType = this.mapLetterTypeToBackend(data.letterType);
      if (data.title || data.subject) backendData.title = data.title || data.subject;
      if (data.content) backendData.content = data.content;
      if (data.contentHtml) backendData.contentHtml = data.contentHtml;
      if (data.status) backendData.status = this.mapStatusToBackend(data.status);
      if (data.recipient || data.category) {
        backendData.generationContext = {
          ...data.generationContext,
          recipient: data.recipient,
          category: data.category,
        };
      }
      
      const updated = await apiRequest<Letter>(config.api.endpoints.letters.update?.replace(":id", id) || `${config.api.endpoints.letters.list}/${id}`, {
        method: "PUT",
        token,
        body: backendData,
      });
      logger.info("Letter updated", { id });
      return this.enhanceLetterWithFrontendFields(updated);
    } catch (error) {
      logger.error("Error updating letter", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.letters.delete?.replace(":id", id) || `${config.api.endpoints.letters.list}/${id}`;
      await apiRequest<void>(endpoint, {
        method: "DELETE",
        token,
      });
      logger.info("Letter deleted", { id });
    } catch (error) {
      logger.error("Error deleting letter", { id, error });
      throw error;
    }
  }

  // Helper methods for field mapping
  private mapLetterTypeToBackend(frontendType: string): string {
    const typeMap: Record<string, string> = {
      'Request for IEP Meeting': 'request',
      'Request for Evaluation': 'request',
      'Request for Independent Educational Evaluation (IEE)': 'request',
      'Request for Records': 'request',
      'Request for Due Process': 'request',
      'Concern About Services': 'concern',
      'Concern About Progress': 'concern',
      'Disagreement with IEP': 'concern',
      'Prior Written Notice Response': 'follow_up',
      'Consent for Evaluation': 'follow_up',
      'Thank You Letter': 'thank_you',
      'Other': 'other',
    };
    return typeMap[frontendType] || frontendType.toLowerCase().replace(/\s+/g, '_');
  }

  private mapLetterTypeToFrontend(backendType: string): string {
    const typeMap: Record<string, string> = {
      'request': 'Request for Evaluation',
      'concern': 'Concern About Services',
      'thank_you': 'Thank You Letter',
      'follow_up': 'Prior Written Notice Response',
      'complaint': 'Disagreement with IEP',
      'appeal': 'Request for Due Process',
      'other': 'Other',
    };
    return typeMap[backendType] || backendType;
  }

  private mapStatusToBackend(frontendStatus: string): string {
    const statusMap: Record<string, string> = {
      'Draft': 'draft',
      'Sent': 'sent',
      'Archived': 'final',
    };
    return statusMap[frontendStatus] || frontendStatus.toLowerCase();
  }

  private mapStatusToFrontend(backendStatus: string): Letter['status'] {
    // Keep backend status values as-is since we updated the type
    return backendStatus as Letter['status'];
  }

  private enhanceLetterWithFrontendFields(letter: Letter): Letter {
    // Extract recipient from generationContext or content
    const recipient = letter.generationContext?.recipient || this.extractRecipient(letter.content);
    const category = letter.generationContext?.category || this.getCategoryFromType(this.mapLetterTypeToFrontend(letter.letterType));
    
    return {
      ...letter,
      subject: letter.title, // Alias title as subject for UI compatibility
      recipient,
      category,
      letterType: this.mapLetterTypeToFrontend(letter.letterType), // Convert to display name
    };
  }

  private extractRecipient(content: string): string {
    // Try to extract recipient from "Dear [Name]," pattern
    const match = content.match(/Dear\s+([^,]+),/i);
    return match ? match[1].trim() : '';
  }

  private getCategoryFromType(type: string): string {
    if (type.includes('Request')) return 'Requests';
    if (type.includes('Concern')) return 'Concerns';
    if (type.includes('Thank You')) return 'Thank You';
    return 'Other';
  }
}

const letterServiceInstance = new LetterServiceImpl();

export function getLetterService(): LetterService {
  return letterServiceInstance;
}
