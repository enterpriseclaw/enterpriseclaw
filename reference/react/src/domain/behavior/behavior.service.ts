import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { BehaviorEntry, CreateBehaviorData, UpdateBehaviorData } from "./types";

// TODO Phase 2: Smart Legal Prompts - Behavior Pattern Analysis
// Implement getPatterns() method to detect:
// 1. Recurring antecedents (frequency >3x/week same trigger)
// 2. Escalating behaviors (intensity/duration increasing over time)
// 3. Environmental patterns (time of day, setting, people present)
// 4. Recommend Functional Behavioral Assessment (FBA) when patterns emerge
// 5. Suggest Behavior Intervention Plan (BIP) development or review
// 6. Identify triggers for proactive supports and prevention strategies

export interface BehaviorService {
  getAll(token: string): Promise<BehaviorEntry[]>;
  getAllByChild(token: string, childId: string): Promise<BehaviorEntry[]>;
  getById(token: string, id: string): Promise<BehaviorEntry>;
  create(token: string, data: CreateBehaviorData): Promise<BehaviorEntry>;
  update(token: string, id: string, data: UpdateBehaviorData): Promise<BehaviorEntry>;
  delete(token: string, id: string): Promise<void>;
}

class BehaviorServiceImpl implements BehaviorService {
  async getAll(token: string): Promise<BehaviorEntry[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ logs: any[] }>(config.api.endpoints.behavior.list, {
        method: "GET",
        token,
      });
      const behaviors = response.logs || [];
      logger.debug("Behaviors fetched", { count: behaviors.length });
      return behaviors.map((b: any) => ({
        id: b.id,
        childId: b.childId,
        date: b.eventDate || '',
        time: b.eventTime || '',
        location: b.location || '',
        antecedent: b.antecedent || '',
        behavior: b.behavior || '',
        consequence: b.consequence || '',
        notes: b.notes || '',
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      }));
    } catch (error) {
      logger.error("Error fetching behaviors", { error });
      throw error;
    }
  }

  async getAllByChild(token: string, childId: string): Promise<BehaviorEntry[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const url = `${config.api.endpoints.behavior.list}?childId=${encodeURIComponent(childId)}`;
      const response = await apiRequest<{ logs: any[] }>(url, {
        method: "GET",
        token,
      });
      const behaviors = response.logs || [];
      // Sort by date/time descending
      behaviors.sort((a: any, b: any) => {
        const dateA = new Date(`${a.eventDate}T${a.eventTime}`).getTime();
        const dateB = new Date(`${b.eventDate}T${b.eventTime}`).getTime();
        return dateB - dateA;
      });
      logger.debug("Behaviors fetched", { childId, count: behaviors.length });
      return behaviors.map((b: any) => ({
        id: b.id,
        childId: b.childId,
        date: b.eventDate || '',
        time: b.eventTime || '',
        location: b.location || '',
        antecedent: b.antecedent || '',
        behavior: b.behavior || '',
        consequence: b.consequence || '',
        notes: b.notes || '',
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      }));
    } catch (error) {
      logger.error("Error fetching behaviors by child", { childId, error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<BehaviorEntry> {
    if (!token) throw new Error("Missing access token");

    try {
      const behavior = await apiRequest<any>(config.api.endpoints.behavior.get.replace(":id", id), {
        method: "GET",
        token,
      });
      
      // Map API response to frontend ABC format
      const mapped: BehaviorEntry = {
        id: behavior.id,
        childId: behavior.childId,
        date: behavior.eventDate || '',
        time: behavior.eventTime || '',
        location: behavior.location || '',
        antecedent: behavior.antecedent || '',
        behavior: behavior.behavior || '',
        consequence: behavior.consequence || '',
        notes: behavior.notes || '',
        createdAt: behavior.createdAt || new Date().toISOString(),
        updatedAt: behavior.updatedAt || new Date().toISOString(),
      };
      
      logger.debug("Behavior fetched", { id, childId: behavior.childId });
      return mapped;
    } catch (error) {
      logger.error("Error fetching behavior", { id, error });
      throw error;
    }
  }

  async create(token: string, data: CreateBehaviorData): Promise<BehaviorEntry> {
    if (!token) throw new Error("Missing access token");
    try {
      // Map frontend ABC model to API schema
      const apiData = {
        childId: data.childId,
        eventDate: data.date, // YYYY-MM-DD
        eventTime: data.time, // HH:mm
        antecedent: data.antecedent,
        behavior: data.behavior,
        consequence: data.consequence,
        intensity: 5, // Default mid-level intensity
        location: data.location,
        notes: data.notes || undefined,
      };
      
      const behavior = await apiRequest<any>(config.api.endpoints.behavior.create, {
        method: "POST",
        token,
        body: apiData,
      });
      logger.info("Behavior entry created", { id: behavior.id, childId: behavior.childId });
      
      // Map response back to frontend format
      return {
        id: behavior.id,
        childId: behavior.childId,
        date: behavior.eventDate,
        time: behavior.eventTime,
        location: behavior.location || '',
        antecedent: behavior.antecedent,
        behavior: behavior.behavior,
        consequence: behavior.consequence,
        notes: behavior.notes || '',
        createdAt: behavior.createdAt || new Date().toISOString(),
        updatedAt: behavior.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error creating behavior", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: UpdateBehaviorData): Promise<BehaviorEntry> {
    if (!token) throw new Error("Missing access token");
    try {
      // Map frontend ABC model to API schema
      const apiData = {
        eventDate: data.date,
        eventTime: data.time,
        antecedent: data.antecedent,
        behavior: data.behavior,
        consequence: data.consequence,
        intensity: 5,
        location: data.location,
        notes: data.notes || undefined,
      };
      
      const updated = await apiRequest<any>(config.api.endpoints.behavior.update.replace(":id", id), {
        method: "PUT",
        token,
        body: apiData,
      });
      logger.info("Behavior entry updated", { id });
      
      // Map response back to frontend format
      return {
        id: updated.id,
        childId: updated.childId,
        date: updated.eventDate,
        time: updated.eventTime,
        location: updated.location || '',
        antecedent: updated.antecedent,
        behavior: updated.behavior,
        consequence: updated.consequence,
        notes: updated.notes || '',
        createdAt: updated.createdAt || new Date().toISOString(),
        updatedAt: updated.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error updating behavior", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      await apiRequest<void>(config.api.endpoints.behavior.delete.replace(":id", id), {
        method: "DELETE",
        token,
      });
      logger.info("Behavior entry deleted", { id });
    } catch (error) {
      logger.error("Error deleting behavior", { id, error });
      throw error;
    }
  }
}

const behaviorServiceInstance = new BehaviorServiceImpl();

export function getBehaviorService(): BehaviorService {
  return behaviorServiceInstance;
}
