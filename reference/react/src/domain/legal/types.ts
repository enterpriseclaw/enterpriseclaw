export interface LegalResource {
  id: string;
  title: string;
  category: string;
  description: string;
  plainLanguage: string;
  citation?: string;
  url?: string;
}

export type LegalSupportRole = "user" | "assistant";

export interface LegalSupportMessage {
  id: string;
  role: LegalSupportRole;
  content: string;
  createdAt: string;
}

export interface CreateLegalSupportSessionResponse {
  sessionId: string;
  messages: LegalSupportMessage[];
}

export interface SendLegalSupportMessageResponse {
  sessionId: string;
  reply: string;
  messages: LegalSupportMessage[];
}
