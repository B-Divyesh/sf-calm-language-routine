export type CardStatus = 'active' | 'archived';

export interface Card {
  id: string;
  front: string;
  back: string;
  language: string;
  note: string;
  dueOn: string;
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  archiveReason?: string;
}

export interface Settings {
  dailyLimit: number;
  weeklyPlan: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface Session {
  date: string;
  cardIds: string[];
  remainingIds: string[];
  completedAt?: string;
}

export interface Reflection {
  id: string;
  week: string;
  text: string;
  createdAt: string;
}

export interface Backup {
  version: 1;
  cards: Card[];
  settings: Settings;
  reflections: Reflection[];
  sessions: Session[];
}

export const today = () => new Date().toISOString().slice(0, 10);
export const uid = () => crypto.randomUUID();
