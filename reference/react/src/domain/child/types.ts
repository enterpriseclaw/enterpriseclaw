export interface Child {
  id: string;
  userId?: string;
  name: string;
  age: number;
  grade: string;
  disabilities?: string[];
  accommodationsSummary?: string;
  servicesSummary?: string;
  accommodations?: string;
  services?: string;
  advocacyBio?: string;
  focusTags?: string[];
  advocacyLevel?: string;
  primaryGoal?: string;
  stateContext?: string;
  lastIepDate?: string;
  nextIepReviewDate?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CreateChildData = Omit<Child, "id" | "createdAt" | "updatedAt">;
export type UpdateChildData = Partial<CreateChildData>;
