import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { ComplianceItem, CreateComplianceData, UpdateComplianceData } from "./types";

// TODO Phase 2: Smart Legal Prompts - IDEA Timeline Calculations
// Implement getTimelines() method to track:
// 1. 60-day evaluation timeline from consent date
// 2. 30-day IEP meeting requirement after evaluation
// 3. 10 school days for PWN before implementation
// 4. Annual IEP review dates
// 5. 3-year reevaluation timeline
// 6. Alert parents X days before deadlines with specific IDEA citations

export interface ComplianceService {
  getAll(token: string): Promise<ComplianceItem[]>;
  getById(token: string, id: string): Promise<ComplianceItem>;
  create(token: string, data: CreateComplianceData): Promise<ComplianceItem>;
  update(token: string, id: string, data: UpdateComplianceData): Promise<ComplianceItem>;
  delete(token: string, id: string): Promise<void>;
}

class ComplianceServiceImpl implements ComplianceService {
  async getAll(token: string): Promise<ComplianceItem[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ logs: any[] } | any[]>(config.api.endpoints.compliance.check, {
        method: "GET",
        token,
      });
      const logs = Array.isArray(response) ? response : (response as any).logs || [];
      logger.debug("Compliance items fetched", { count: logs.length });
      return logs;
    } catch (error) {
      logger.error("Error fetching compliance items", { error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<ComplianceItem> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.compliance.get?.replace(":id", id) || `${config.api.endpoints.compliance.check}/${id}`;
      const item = await apiRequest<ComplianceItem>(endpoint, {
        method: "GET",
        token,
      });
      logger.debug("Compliance item fetched", { id });
      return item;
    } catch (error) {
      logger.error("Error fetching compliance item", { id, error });
      throw error;
    }
  }

  async create(token: string, data: CreateComplianceData): Promise<ComplianceItem> {
    if (!token) throw new Error("Missing access token");
    try {
      const item = await apiRequest<ComplianceItem>(config.api.endpoints.compliance.check, {
        method: "POST",
        token,
        body: data,
      });
      logger.info("Compliance item created", { id: item.id });
      return item;
    } catch (error) {
      logger.error("Error creating compliance item", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: UpdateComplianceData): Promise<ComplianceItem> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.compliance.update?.replace(":id", id) || `${config.api.endpoints.compliance.check}/${id}`;
      const updated = await apiRequest<ComplianceItem>(endpoint, {
        method: "PUT",
        token,
        body: data,
      });
      logger.info("Compliance item updated", { id });
      return updated;
    } catch (error) {
      logger.error("Error updating compliance item", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      const endpoint = config.api.endpoints.compliance.delete?.replace(":id", id) || `${config.api.endpoints.compliance.check}/${id}`;
      await apiRequest<void>(endpoint, {
        method: "DELETE",
        token,
      });
      logger.info("Compliance item deleted", { id });
    } catch (error) {
      logger.error("Error deleting compliance item", { id, error });
      throw error;
    }
  }
}

const complianceServiceInstance = new ComplianceServiceImpl();

export function getComplianceService(): ComplianceService {
  return complianceServiceInstance;
}
