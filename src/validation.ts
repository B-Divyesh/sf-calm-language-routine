import type { Backup, Card, Reflection, Session, Settings } from './types';

const THEMES: Settings['theme'][] = ['light', 'dark', 'system'];
const CARD_STATUSES: Card['status'][] = ['active', 'archived'];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number, allowEmpty = true): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function dateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function timestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function optionalText(value: unknown, max: number): value is string | undefined {
  return value === undefined || text(value, max);
}

export function isCard(value: unknown): value is Card {
  if (!record(value)) return false;
  return text(value.id, 200, false)
    && text(value.front, 600, false)
    && text(value.back, 600, false)
    && text(value.language, 80)
    && text(value.note, 1000)
    && dateOnly(value.dueOn)
    && typeof value.status === 'string'
    && CARD_STATUSES.includes(value.status as Card['status'])
    && timestamp(value.createdAt)
    && timestamp(value.updatedAt)
    && (value.archivedAt === undefined || timestamp(value.archivedAt))
    && optionalText(value.archiveReason, 200);
}

export function isReflection(value: unknown): value is Reflection {
  if (!record(value)) return false;
  return text(value.id, 200, false)
    && dateOnly(value.week)
    && text(value.text, 1200, false)
    && timestamp(value.createdAt);
}

export function isSession(value: unknown): value is Session {
  if (!record(value) || !dateOnly(value.date)) return false;
  if (!Array.isArray(value.cardIds) || !value.cardIds.every((item) => text(item, 200, false))) return false;
  if (!Array.isArray(value.remainingIds) || !value.remainingIds.every((item) => text(item, 200, false))) return false;
  if (value.completedAt !== undefined && !timestamp(value.completedAt)) return false;
  const cardIds = value.cardIds as string[];
  const remainingIds = value.remainingIds as string[];
  return remainingIds.every((id) => cardIds.includes(id));
}

export function isSettings(value: unknown): value is Settings {
  if (!record(value)) return false;
  return typeof value.dailyLimit === 'number'
    && Number.isInteger(value.dailyLimit)
    && value.dailyLimit >= 1
    && value.dailyLimit <= 20
    && typeof value.weeklyPlan === 'boolean'
    && typeof value.theme === 'string'
    && THEMES.includes(value.theme as Settings['theme']);
}

export function safeSettings(value: unknown): Settings {
  return isSettings(value) ? { ...value } : { dailyLimit: 7, weeklyPlan: false, theme: 'system' };
}

export function parseBackup(value: unknown): Backup {
  if (!record(value) || value.version !== 1) throw new Error('Unsupported backup version.');
  if (!Array.isArray(value.cards) || !value.cards.every(isCard)) throw new Error('Invalid cards.');
  if (!isSettings(value.settings)) throw new Error('Invalid settings.');
  if (!Array.isArray(value.reflections) || !value.reflections.every(isReflection)) throw new Error('Invalid reflections.');
  const sessions = value.sessions === undefined ? [] : value.sessions;
  if (!Array.isArray(sessions) || !sessions.every(isSession)) throw new Error('Invalid sessions.');
  return {
    version: 1,
    cards: value.cards.map((card) => ({ ...card })),
    settings: { ...value.settings },
    reflections: value.reflections.map((reflection) => ({ ...reflection })),
    sessions: sessions.map((session) => ({ ...session, cardIds: [...session.cardIds], remainingIds: [...session.remainingIds] }))
  };
}
