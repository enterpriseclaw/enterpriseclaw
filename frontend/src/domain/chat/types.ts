export interface ChatSession {
  sessionId: string;
  title: string | null;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'done' | 'error';
  toolChips?: ToolChip[];
  questionCard?: QuestionCard;
}

export interface ToolChip {
  tool: string;
  status: 'running' | 'done' | 'error';
}

export interface QuestionCard {
  questionId: string;
  text: string;
  answered: boolean;
}

export interface ChatEvent {
  type: 'token' | 'tool_call' | 'tool_done' | 'question' | 'done' | 'error';
  text?: string;
  tool?: string;
  questionId?: string;
  message?: string;
}
