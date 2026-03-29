import { config } from "@/lib/config";
import { apiRequest, ApiError } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { Child, CreateChildData, UpdateChildData } from "./types";

export interface ChildService {
  getAll(token: string): Promise<Child[]>;
  getById(token: string, id: string): Promise<Child>;
  create(token: string, data: CreateChildData): Promise<Child>;
  update(token: string, id: string, data: UpdateChildData): Promise<Child>;
  delete(token: string, id: string): Promise<void>;
}

class ChildServiceImpl implements ChildService {
  async getAll(token: string): Promise<Child[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ children: Child[] }>(config.api.endpoints.children.list, {
        method: "GET",
        token,
      });

      const children = response.children || [];
      logger.debug("Children fetched", { count: children.length });
      return children;
    } catch (error) {
      logger.error("Error fetching children", { error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<Child> {
    if (!token) throw new Error("Missing access token");
    try {
      const child = await apiRequest<Child>(config.api.endpoints.children.get.replace(":id", id), {
        method: "GET",
        token,
      });
      logger.debug("Child fetched", { id, name: child.name });
      return child;
    } catch (error) {
      logger.error("Error fetching child", { id, error });
      throw error;
    }
  }

  async create(token: string, data: CreateChildData): Promise<Child> {
    if (!token) throw new Error("Missing access token");
    try {
      const child = await apiRequest<Child>(config.api.endpoints.children.create, {
        method: "POST",
        token,
        body: data,
      });
      logger.info("Child created", { id: child.id, name: child.name });
      return child;
    } catch (error) {
      logger.error("Error creating child", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: UpdateChildData): Promise<Child> {
    if (!token) throw new Error("Missing access token");
    try {
      const updated = await apiRequest<Child>(config.api.endpoints.children.update.replace(":id", id), {
        method: "PATCH",
        token,
        body: data,
      });
      logger.info("Child updated", { id, name: updated.name });
      return updated;
    } catch (error) {
      logger.error("Error updating child", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      await apiRequest<void>(config.api.endpoints.children.delete.replace(":id", id), {
        method: "DELETE",
        token,
      });
      logger.info("Child deleted", { id });
    } catch (error) {
      logger.error("Error deleting child", { id, error });
      throw error;
    }
  }
}

const childServiceInstance = new ChildServiceImpl();

export function getChildService(): ChildService {
  return childServiceInstance;
}
