import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { AdvocacyInsight, CreateAdvocacyInsightData } from "./types";

// TODO Phase 2: Smart Legal Prompts - Advocacy Recommendations
// Implement getRecommendations() method to prioritize actions:
// 1. Analyze goal progress data to identify stagnation patterns
// 2. Cross-reference with service delivery logs for gaps
// 3. Calculate days since last parent concern documented
// 4. Detect missing PWN for any documented parent requests
// 5. Identify LRE concerns if child's time in gen ed decreasing
// 6. Recommend specific IDEA citations for each concern

export interface AdvocacyService {
  getInsights(token: string, childId?: string): Promise<AdvocacyInsight[]>;
  getById(token: string, id: string): Promise<AdvocacyInsight>;
  create(token: string, data: CreateAdvocacyInsightData): Promise<AdvocacyInsight>;
  update(token: string, id: string, data: Partial<CreateAdvocacyInsightData>): Promise<AdvocacyInsight>;
  delete(token: string, id: string): Promise<void>;
}

class AdvocacyServiceImpl implements AdvocacyService {
  async getInsights(token: string, childId?: string): Promise<AdvocacyInsight[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const params = childId ? `?childId=${encodeURIComponent(childId)}` : "";
      const response = await apiRequest<{ insights: any[] }>(`${config.api.endpoints.advocacy.resources}${params}`, {
        method: "GET",
        token,
      });
      const insights = response.insights || [];
      logger.debug("Advocacy insights loaded", { childId, count: insights.length });
      return insights as AdvocacyInsight[];
    } catch (error) {
      logger.error("Error loading advocacy insights", { childId, error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<AdvocacyInsight> {
    if (!token) throw new Error("Missing access token");
    try {
      const insight = await apiRequest<AdvocacyInsight>(`${config.api.endpoints.advocacy.resources}/${id}`, {
        method: "GET",
        token,
      });
      logger.debug("Advocacy insight loaded", { id });
      return insight;
    } catch (error) {
      logger.error("Error loading advocacy insight", { id, error });
      throw error;
    }
  }

  async create(token: string, data: CreateAdvocacyInsightData): Promise<AdvocacyInsight> {
    if (!token) throw new Error("Missing access token");
    try {
      const newInsight = await apiRequest<AdvocacyInsight>(config.api.endpoints.advocacy.resources, {
        method: "POST",
        token,
        body: data,
      });
      logger.info("Advocacy insight created", { id: newInsight.id });
      return newInsight;
    } catch (error) {
      logger.error("Error creating advocacy insight", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: Partial<CreateAdvocacyInsightData>): Promise<AdvocacyInsight> {
    if (!token) throw new Error("Missing access token");
    try {
      const updated = await apiRequest<AdvocacyInsight>(`${config.api.endpoints.advocacy.resources}/${id}`, {
        method: "PUT",
        token,
        body: data,
      });
      logger.info("Advocacy insight updated", { id });
      return updated;
    } catch (error) {
      logger.error("Error updating advocacy insight", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      await apiRequest<void>(`${config.api.endpoints.advocacy.resources}/${id}`, {
        method: "DELETE",
        token,
      });
      logger.info("Advocacy insight deleted", { id });
    } catch (error) {
      logger.error("Error deleting advocacy insight", { id, error });
      throw error;
    }
  }
}

const advocacyServiceInstance = new AdvocacyServiceImpl();

export function getAdvocacyService(): AdvocacyService {
  return advocacyServiceInstance;
}
