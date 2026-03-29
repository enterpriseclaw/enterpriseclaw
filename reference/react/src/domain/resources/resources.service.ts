import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { Resource, CreateResourceData, UpdateResourceData } from "./types";

export interface ResourcesService {
  getAll(token: string): Promise<Resource[]>;
  search(token: string, query?: { category?: string; term?: string }): Promise<Resource[]>;
}

class ResourcesServiceImpl implements ResourcesService {
  async getAll(token: string): Promise<Resource[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ resources: any[] }>(config.api.endpoints.resources.list, {
        method: "GET",
        token,
      });
      const resources = response.resources || [];
      logger.debug("Resources fetched", { count: resources.length });
      return resources as Resource[];
    } catch (error) {
      logger.error("Error fetching resources", { error });
      throw error;
    }
  }

  async search(token: string, query?: { category?: string; term?: string }): Promise<Resource[]> {
    if (!token) throw new Error("Missing access token");
    const params = new URLSearchParams();
    if (query?.category) params.set("category", query.category);
    if (query?.term) params.set("q", query.term);
    const url =
      params.toString().length > 0
        ? `${config.api.endpoints.resources.search}?${params.toString()}`
        : config.api.endpoints.resources.search;

    try {
      const response = await apiRequest<{ resources: any[] }>(url, {
        method: "GET",
        token,
      });
      const resources = response.resources || [];
      logger.debug("Resources search fetched", { count: resources.length, query });
      return resources as Resource[];
    } catch (error) {
      logger.error("Error searching resources", { query, error });
      throw error;
    }
  }
}

const resourcesServiceInstance = new ResourcesServiceImpl();

export function getResourcesService(): ResourcesService {
  return resourcesServiceInstance;
}
