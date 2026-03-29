import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { LetterTemplate, CreateLetterTemplateData, UpdateLetterTemplateData, GenerateDraftContext } from "./types";

export interface LettersService {
  getAll(token: string): Promise<LetterTemplate[]>;
  getById(token: string, id: string): Promise<LetterTemplate>;
  generateDraft(token: string, templateId: string, context: GenerateDraftContext): Promise<string>;
  create(token: string, data: CreateLetterTemplateData): Promise<LetterTemplate>;
  update(token: string, id: string, data: UpdateLetterTemplateData): Promise<LetterTemplate>;
  delete(token: string, id: string): Promise<void>;
}

class LettersServiceImpl implements LettersService {
  async getAll(token: string): Promise<LetterTemplate[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ letters: any[] }>(config.api.endpoints.letters.templates ?? config.api.endpoints.letters.list, {
        method: "GET",
        token,
      });
      const templates = response.letters || [];
      logger.debug("Letter templates fetched", { count: templates.length });
      return templates as LetterTemplate[];
    } catch (error) {
      logger.error("Error fetching letter templates", { error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<LetterTemplate> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.letters.get?.replace(":id", id) || `${config.api.endpoints.letters.list}/${id}`;
      const template = await apiRequest<LetterTemplate>(endpoint, {
        method: "GET",
        token,
      });
      logger.debug("Letter template fetched", { id });
      return template;
    } catch (error) {
      logger.error("Error fetching letter template", { id, error });
      throw error;
    }
  }

  async generateDraft(token: string, templateId: string, context: GenerateDraftContext): Promise<string> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.letters.generate ?? `${config.api.endpoints.letters.list}/generate`;
      const result = await apiRequest<{ content: string } | string>(endpoint, {
        method: "POST",
        token,
        body: { templateId, context },
      });

      const draft = typeof result === "string" ? result : result?.content ?? "";
      logger.info("Draft generated", { templateId, contextKeys: Object.keys(context) });
      return draft;
    } catch (error) {
      logger.error("Error generating draft", { templateId, error });
      throw error;
    }
  }

  async create(token: string, data: CreateLetterTemplateData): Promise<LetterTemplate> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.letters.templates ?? config.api.endpoints.letters.list;
      const template = await apiRequest<LetterTemplate>(endpoint, {
        method: "POST",
        token,
        body: data,
      });
      logger.info("Letter template created", { id: template.id, name: template.name });
      return template;
    } catch (error) {
      logger.error("Error creating letter template", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: UpdateLetterTemplateData): Promise<LetterTemplate> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.letters.update?.replace(":id", id) || `${config.api.endpoints.letters.list}/${id}`;
      const updated = await apiRequest<LetterTemplate>(endpoint, {
        method: "PATCH",
        token,
        body: data,
      });
      logger.info("Letter template updated", { id });
      return updated;
    } catch (error) {
      logger.error("Error updating letter template", { id, error });
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
      logger.info("Letter template deleted", { id });
    } catch (error) {
      logger.error("Error deleting letter template", { id, error });
      throw error;
    }
  }
}

const lettersServiceInstance = new LettersServiceImpl();

export function getLettersService(): LettersService {
  return lettersServiceInstance;
}
