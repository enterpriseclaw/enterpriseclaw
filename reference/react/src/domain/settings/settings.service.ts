import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { UserPreferences, UpdatePreferencesData } from "./types";

export interface SettingsService {
  getPreferences(token: string): Promise<UserPreferences>;
  updatePreferences(token: string, data: UpdatePreferencesData): Promise<UserPreferences>;
}

class SettingsServiceImpl implements SettingsService {
  async getPreferences(token: string): Promise<UserPreferences> {
    if (!token) throw new Error("Missing access token");
    try {
      const prefs = await apiRequest<UserPreferences>(config.api.endpoints.preferences.get, {
        method: "GET",
        token,
      });
      logger.debug("User preferences fetched");
      return prefs;
    } catch (error) {
      logger.error("Error fetching preferences", { error });
      throw error;
    }
  }

  async updatePreferences(token: string, data: UpdatePreferencesData): Promise<UserPreferences> {
    if (!token) throw new Error("Missing access token");
    try {
      const updated = await apiRequest<UserPreferences>(config.api.endpoints.preferences.update, {
        method: "PUT",
        token,
        body: data,
      });
      logger.info("User preferences updated");
      return updated;
    } catch (error) {
      logger.error("Error updating preferences", { error });
      throw error;
    }
  }
}

const settingsServiceInstance = new SettingsServiceImpl();

export function getSettingsService(): SettingsService {
  return settingsServiceInstance;
}
