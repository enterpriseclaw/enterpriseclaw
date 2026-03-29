export interface BehaviorEntry {
  id: string;
  childId: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  location: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateBehaviorData = Omit<BehaviorEntry, "id" | "createdAt" | "updatedAt">;
export type UpdateBehaviorData = Partial<CreateBehaviorData>;
