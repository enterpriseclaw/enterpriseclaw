import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type {
  LegalResource,
  CreateLegalSupportSessionResponse,
  SendLegalSupportMessageResponse,
} from "./types";

export interface LegalService {
  getAll(token: string): Promise<LegalResource[]>;
  getById(token: string, id: string): Promise<LegalResource>;
  searchByCategory(token: string, category: string): Promise<LegalResource[]>;
  createSupportSession(token: string): Promise<CreateLegalSupportSessionResponse>;
  sendSupportMessage(token: string, sessionId: string, message: string): Promise<SendLegalSupportMessageResponse>;
  getSupportSession(token: string, sessionId: string): Promise<CreateLegalSupportSessionResponse>;
}

class LegalServiceImpl implements LegalService {
  async getAll(token: string): Promise<LegalResource[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const resp = await apiRequest<any>(config.api.endpoints.legal.resources, {
        method: "GET",
        token,
      });

      // API may return either an array or an object { resources: [...] }
      const resources: LegalResource[] = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.resources)
        ? resp.resources
        : [];

      logger.debug("Legal resources fetched", { count: resources.length });
      return resources;
    } catch (error) {
      logger.error("Error fetching legal resources", { error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<LegalResource> {
    if (!token) throw new Error("Missing access token");
    try {
      const resource = await apiRequest<LegalResource>(`${config.api.endpoints.legal.resources}/${id}`, {
        method: "GET",
        token,
      });
      logger.debug("Legal resource fetched", { id });
      return resource;
    } catch (error) {
      logger.error("Error fetching legal resource", { id, error });
      throw error;
    }
  }

  async searchByCategory(token: string, category: string): Promise<LegalResource[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const url = `${config.api.endpoints.legal.resources}?category=${encodeURIComponent(category)}`;
      const resp = await apiRequest<any>(url, {
        method: "GET",
        token,
      });

      const filtered: LegalResource[] = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.resources)
        ? resp.resources
        : [];

      logger.debug("Legal resources searched", { category, count: filtered.length });
      return filtered;
    } catch (error) {
      logger.error("Error searching legal resources", { category, error });
      throw error;
    }
  }

  async createSupportSession(token: string): Promise<CreateLegalSupportSessionResponse> {
    if (!token) throw new Error("Missing access token");
    const response = await apiRequest<CreateLegalSupportSessionResponse>(config.api.endpoints.legal.supportSessions, {
      method: "POST",
      token,
    });
    logger.debug("Legal support session created", { sessionId: response.sessionId });
    return response;
  }

  async sendSupportMessage(token: string, sessionId: string, message: string): Promise<SendLegalSupportMessageResponse> {
    if (!token) throw new Error("Missing access token");
    if (!sessionId) throw new Error("Missing session id");
    const response = await apiRequest<SendLegalSupportMessageResponse>(
      `${config.api.endpoints.legal.supportSessions}/${sessionId}/messages`,
      {
        method: "POST",
        token,
        body: { message },
      }
    );
    logger.debug("Legal support message sent", { sessionId });
    return response;
  }

  async getSupportSession(token: string, sessionId: string): Promise<CreateLegalSupportSessionResponse> {
    if (!token) throw new Error("Missing access token");
    const response = await apiRequest<CreateLegalSupportSessionResponse>(
      `${config.api.endpoints.legal.supportSessions}/${sessionId}`,
      {
        method: "GET",
        token,
      }
    );
    logger.debug("Legal support session fetched", { sessionId });
    return response;
  }
}

const legalServiceInstance = new LegalServiceImpl();

export function getLegalService(): LegalService {
  return legalServiceInstance;
}
