import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { Goal, ProgressEntry, CreateGoalData, UpdateGoalData } from "./types";

// Backend response type (what API actually returns)
interface BackendGoalResponse {
  id: string;
  childId: string;
  goalText: string;
  goalName?: string;
  goalNumber?: string | number;
  areaOfNeed?: string;
  domain?: string;
  category: string;
  targetDate?: string;
  status: string;
  progressPercentage?: number;
  notes: string;
  milestonesData?: Record<string, any>;
  lastUpdated: string;
  createdAt: string;
}

// TODO Phase 2: Smart Legal Prompts - Limited Progress Detection
// Implement getPrompts() method to detect:
// 1. Goals with <10% improvement over 90+ days (limited progress pattern)
// 2. Calculate progress velocity (rate of improvement)
// 3. Recommend IEP team meeting if stagnation detected across multiple goals
// 4. Flag goals approaching end date without meaningful progress
// 5. Compare progress against typical growth rates for skill area

export interface GoalsService {
  getAllByChild(token: string, childId: string): Promise<Goal[]>;
  getById(token: string, id: string): Promise<Goal>;
  getProgressHistory(token: string, goalId: string): Promise<ProgressEntry[]>;
  create(token: string, data: CreateGoalData): Promise<Goal>;
  update(token: string, id: string, data: UpdateGoalData): Promise<Goal>;
  delete(token: string, id: string): Promise<void>;
}

// Map backend response to frontend Goal type
function mapBackendGoalToFrontend(backendGoal: BackendGoalResponse): Goal {
  const categoryMap: Record<string, string> = {
    academic: "Academic",
    behavioral: "Behavior",
    behavior: "Behavior",
    communication: "Communication",
    social: "Social Skills",
    adaptive: "Adaptive Skills",
    motor: "Motor Skills",
    reading: "Reading",
    math: "Math",
    writing: "Writing",
    social_emotional: "Social Emotional",
    speech_language: "Speech & Language",
    occupational_therapy: "Occupational Therapy",
    physical_therapy: "Physical Therapy",
    self_care_independent_living: "Self-Care & Independent Living",
    vocational: "Vocational",
    transition: "Transition",
    other: "Other"
  };

  const rawDomain = backendGoal.domain || backendGoal.category || "";
  const displayArea = categoryMap[rawDomain] || (rawDomain ? rawDomain.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "General");

  return {
    id: backendGoal.id,
    childId: backendGoal.childId,
    iepId: undefined,
    area: displayArea,
    goalArea: displayArea,
    skillFocus: backendGoal.goalName || backendGoal.areaOfNeed || "",
    description: backendGoal.goalText || "",
    baseline: 0,
    baselineLevel: 0,
    baselineText: "",
    target: 100,
    targetLevel: 100,
    targetText: "",
    current: backendGoal.progressPercentage || 0,
    currentLevel: backendGoal.progressPercentage || 0,
    metric: "%",
    duration: backendGoal.targetDate ? new Date(backendGoal.targetDate).toLocaleDateString() : "",
    timeline: backendGoal.targetDate ? new Date(backendGoal.targetDate).toLocaleDateString() : "",
    status: mapBackendStatus(backendGoal.status),
    goalStatement: backendGoal.goalText || "",
    notes: backendGoal.notes || "",
    createdAt: backendGoal.createdAt,
    updatedAt: backendGoal.lastUpdated || backendGoal.createdAt,
  };
}

function mapBackendStatus(status: string): "Not Started" | "In Progress" | "Achieved" | "Discontinued" {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "achieved":
      return "Achieved";
    case "discontinued":
    case "modified":
      return "Discontinued";
    default:
      return "Not Started";
  }
}

class GoalsServiceImpl implements GoalsService {
  async getAllByChild(token: string, childId: string): Promise<Goal[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const url = `${config.api.endpoints.goals.list}?childId=${encodeURIComponent(childId)}`;
      const response = await apiRequest<BackendGoalResponse[] | { goals: BackendGoalResponse[]; data: BackendGoalResponse[] }>(url, {
        method: "GET",
        token,
      });
      const backendGoals = Array.isArray(response) ? response : (response.goals || response.data || []);
      const goals = backendGoals.map(mapBackendGoalToFrontend);
      logger.debug("Goals fetched and mapped", { childId, count: goals.length });
      return goals;
    } catch (error) {
      logger.error("Error fetching goals", { childId, error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<Goal> {
    if (!token) throw new Error("Missing access token");
    try {
      const backendGoal = await apiRequest<BackendGoalResponse>(config.api.endpoints.goals.get.replace(":id", id), {
        method: "GET",
        token,
      });
      const goal = mapBackendGoalToFrontend(backendGoal);
      logger.debug("Goal fetched and mapped", { id, childId: goal.childId });
      return goal;
    } catch (error) {
      logger.error("Error fetching goal", { id, error });
      throw error;
    }
  }

  async getProgressHistory(token: string, goalId: string): Promise<ProgressEntry[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const entries = await apiRequest<ProgressEntry[]>(config.api.endpoints.goals.progress.replace(":id", goalId), {
        method: "GET",
        token,
      });
      logger.debug("Progress history fetched", { goalId, count: entries.length });
      return entries;
    } catch (error) {
      logger.error("Error fetching progress history", { goalId, error });
      throw error;
    }
  }

  async create(token: string, data: CreateGoalData): Promise<Goal> {
    if (!token) throw new Error("Missing access token");
    try {
      const goal = await apiRequest<Goal>(config.api.endpoints.goals.create, {
        method: "POST",
        token,
        body: data,
      });
      logger.info("Goal created", { id: goal.id, area: goal.area });
      return goal;
    } catch (error) {
      logger.error("Error creating goal", { error });
      throw error;
    }
  }

  async update(token: string, id: string, data: UpdateGoalData): Promise<Goal> {
    if (!token) throw new Error("Missing access token");
    try {
      const updated = await apiRequest<Goal>(config.api.endpoints.goals.update.replace(":id", id), {
        method: "PUT",
        token,
        body: data,
      });
      logger.info("Goal updated", { id });
      return updated;
    } catch (error) {
      logger.error("Error updating goal", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      await apiRequest<void>(config.api.endpoints.goals.delete.replace(":id", id), {
        method: "DELETE",
        token,
      });
      logger.info("Goal deleted", { id });
    } catch (error) {
      logger.error("Error deleting goal", { id, error });
      throw error;
    }
  }
}

const goalsServiceInstance = new GoalsServiceImpl();

export function getGoalsService(): GoalsService {
  return goalsServiceInstance;
}
