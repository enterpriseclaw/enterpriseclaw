import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { DashboardSummary } from "./types";

export interface DashboardService {
  getSummary(token: string): Promise<DashboardSummary>;
}

class DashboardServiceImpl implements DashboardService {
  async getSummary(token: string): Promise<DashboardSummary> {
    if (!token) throw new Error("Missing access token");
    try {
      const summary = await apiRequest<DashboardSummary>(config.api.endpoints.dashboard.stats, {
        method: "GET",
        token,
      });
      logger.debug("Dashboard summary fetched");
      return summary;
    } catch (error) {
      logger.error("Error fetching dashboard summary", { error });
      throw error;
    }
  }
}

const dashboardServiceInstance = new DashboardServiceImpl();

export function getDashboardService(): DashboardService {
  return dashboardServiceInstance;
}
