export interface Letter {
  id: string;
  userId?: string;
  childId: string;
  letterType: string; // Backend: 'request' | 'concern' | 'thank_you' | 'follow_up' | 'complaint' | 'appeal' | 'other'
  title: string; // The letter title (used for subject line)
  content: string; // The full letter text
  contentHtml?: string;
  status: "draft" | "final" | "sent"; // Backend enum values
  aiModel?: string;
  generationContext?: Record<string, any>;
  revisionCount?: number;
  sentDate?: string;
  sentTo?: string[];
  sentMethod?: string;
  parentDraftId?: string;
  versionNumber?: number;
  lastEdited?: string;
  createdAt: string;
  updatedAt?: string;
  // Frontend-only fields for UI
  category?: string; // Derived from letterType: "Requests", "Concerns", "Thank You", etc.
  recipient?: string; // Extracted from content or user input
  subject?: string; // Alias for title
}

export interface LetterTemplate {
  id: string;
  userId: string;
  name: string;
  category: string;
  template: string;
}

export type CreateLetterData = Omit<Letter, "id" | "createdAt" | "updatedAt">;
export type UpdateLetterData = Partial<Omit<CreateLetterData, "userId">>;

export type CreateLetterTemplateData = Omit<LetterTemplate, "id">;
export type UpdateLetterTemplateData = Partial<CreateLetterTemplateData>;

export interface GenerateDraftContext {
  childName?: string;
  date?: string;
  yourName?: string;
  [key: string]: string | undefined;
}

