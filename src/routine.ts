import type { Card, Session } from './types';

export const clampLimit = (value: number) => Math.max(1, Math.min(20, Math.round(value || 7)));

export function makeSession(cards: Card[], date: string, limit: number): Session {
  const ids = cards
    .filter((card) => card.status === 'active' && card.dueOn <= date)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.createdAt.localeCompare(b.createdAt))
    .slice(0, clampLimit(limit))
    .map((card) => card.id);
  return { date, cardIds: ids, remainingIds: [...ids] };
}

export function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function cardsCsv(cards: Card[]): string {
  const headers = ['front', 'back', 'language', 'note', 'dueOn', 'status', 'archiveReason', 'createdAt'];
  const rows = cards.map((card) => headers.map((key) => csvCell(String(card[key as keyof Card] ?? '')).replace(/\r?\n/g, '\n')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function nextWeekLabel(date = new Date()): string {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday.toISOString().slice(0, 10);
}
