export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // Markdown content
  image?: string; // Base64 image
  diagram?: string; // Mermaid code
  timestamp: number;
}

export interface StudySession {
  id: string;
  topic: string;
  date: number;
  messages: Message[];
}

export interface LearningStat {
  topic: string;
  quizScore: number; // Percentage 0-100
  date: string; // ISO date
}

export enum AppMode {
  STUDY = 'study',
  QUIZ = 'quiz',
  PROGRESS = 'progress'
}
