import { apiRequest } from '@/lib/http';
import { config } from '@/lib/config';
import type { ChatSession } from './types';

class ChatService {
  async createSession(): Promise<ChatSession> {
    return apiRequest<ChatSession>(config.api.endpoints.sessions, { method: 'POST' });
  }

  async listSessions(): Promise<ChatSession[]> {
    return apiRequest<ChatSession[]>(config.api.endpoints.sessions);
  }

  async deleteSession(id: string): Promise<void> {
    await apiRequest(config.api.endpoints.session(id), { method: 'DELETE' });
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await apiRequest(`${config.api.endpoints.session(id)}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async submitAnswer(sessionId: string, questionId: string, answer: string): Promise<void> {
    await apiRequest(config.api.endpoints.chatAnswer, {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionId, answer }),
    });
  }
}

let instance: ChatService | null = null;
export function getChatService(): ChatService {
  if (!instance) instance = new ChatService();
  return instance;
}
