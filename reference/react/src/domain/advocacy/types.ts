export interface AdvocacyInsight {
  id: string;
  userId: string;
  childId?: string; // Optional - some advocacy insights may not be child-specific
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  createdAt: string;
}

export type CreateAdvocacyInsightData = Omit<AdvocacyInsight, "id" | "createdAt">;
