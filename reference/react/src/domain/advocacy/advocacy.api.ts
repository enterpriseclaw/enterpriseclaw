import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";

export interface ChatMessageResponse {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export interface AdvocacySession {
  id: string;
  scenarioType: string;
  goal: string;
  messages: ChatMessageResponse[];
  status: string;
}

export async function createSession(scenarioType: string, goal: string, childId?: string) {
  try {
    const url = config.api.resolveUrl('/api/v1/advocacy/sessions');
    const session = await apiRequest<{ session: AdvocacySession }>(url, {
      method: 'POST',
      body: { scenarioType, goal, childId },
    });
    return session.session;
  } catch (err) {
    logger.error('Failed to create advocacy session', { err });
    throw err;
  }
}

export async function sendSessionMessage(sessionId: string, message: string, childContext?: string) {
  try {
    const url = config.api.resolveUrl(`/api/v1/advocacy/sessions/${sessionId}/messages`);
    const resp = await apiRequest<{ response: ChatMessageResponse }>(url, {
      method: 'POST',
      body: { message, childContext },
    });
    return resp.response;
  } catch (err) {
    logger.error('Failed to send session message', { sessionId, err });
    throw err;
  }
}

export async function getQuickPrompts() {
  try {
    const url = config.api.resolveUrl('/api/v1/advocacy/prompts');
    const resp = await apiRequest<{ prompts: string[] }>(url, { method: 'GET' });
    return resp.prompts || [];
  } catch (err) {
    logger.error('Failed to load quick prompts', { err });
    return [];
  }
}

export async function deleteSession(sessionId: string) {
  try {
    const url = config.api.resolveUrl(`/api/v1/advocacy/sessions/${sessionId}`);
    await apiRequest<void>(url, { method: 'DELETE' });
  } catch (err) {
    logger.error('Failed to delete session', { sessionId, err });
    throw err;
  }
}

export async function simulateMeeting(userMessage: string, childContext?: string) {
  try {
    const url = config.api.resolveUrl('/api/v1/advocacy/simulate-meeting');
    const resp = await apiRequest<{ response: ChatMessageResponse }>(url, {
      method: 'POST',
      body: { userMessage, childContext },
    });
    return resp.response;
  } catch (err) {
    logger.error('Failed to perform stateless simulate meeting', { err });
    throw err;
  }
}
