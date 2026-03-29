export interface Goal {
  id: string;
  childId: string;
  iepId?: string;
  area: string; // "Reading", "Math", "Communication", "Social Skills", "Behavior", etc.
  goalArea: string; // Alias for area
  skillFocus: string;
  description: string;
  baseline: number;
  baselineLevel?: number; // Alias for baseline
  baselineText: string; // Text description of baseline
  target: number;
  targetLevel?: number; // Alias for target
  targetText: string; // Text description of target
  current: number;
  currentLevel?: number; // Alias for current
  metric: string;
  duration: string;
  timeline: string; // Alias for duration
  status: "Not Started" | "In Progress" | "Achieved" | "Discontinued";
  goalStatement: string; // Auto-generated or manual IEP goal statement
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEntry {
  id: string;
  goalId: string;
  date: string;
  score: number;
  notes: string;
}

export type CreateGoalData = Omit<Goal, "id" | "createdAt" | "updatedAt">;
export type UpdateGoalData = Partial<Omit<CreateGoalData, "childId">>;
