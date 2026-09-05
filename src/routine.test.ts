import { describe, expect, it } from 'vitest';
import { cardsCsv, makeSession } from './routine';
import type { Card } from './types';
import { parseBackup } from './validation';

const card = (id: string, dueOn: string): Card => ({ id, dueOn, front: id, back: 'answer', language: '', note: '', status: 'active', createdAt: id, updatedAt: id });

describe('the finite daily routine', () => {
  it('takes only due cards in stable order and honours the daily limit', () => {
    expect(makeSession([card('later', '2026-09-01'), card('b', '2026-08-28'), card('a', '2026-08-27')], '2026-08-28', 2).cardIds).toEqual(['a', 'b']);
  });
  it('escapes card text in CSV exports', () => {
    expect(cardsCsv([{ ...card('one', '2026-08-28'), front: 'She said "hello"' }])).toContain('"She said ""hello"""');
  });

  it('clamps the daily set to the documented 1 and 20 card boundaries', () => {
    const cards = Array.from({ length: 25 }, (_, index) => card(String(index).padStart(2, '0'), '2026-08-28'));
    expect(makeSession(cards, '2026-08-28', 0).cardIds).toHaveLength(7);
    expect(makeSession(cards, '2026-08-28', 1).cardIds).toHaveLength(1);
    expect(makeSession(cards, '2026-08-28', 99).cardIds).toHaveLength(20);
  });

  it('rejects a structured backup before a wrong card type can be stored', () => {
    expect(() => parseBackup({
      version: 1,
      cards: [{ ...card('one', '2026-08-28'), front: 42 }],
      settings: { dailyLimit: 7, weeklyPlan: false, theme: 'system' },
      reflections: [],
      sessions: []
    })).toThrow('Invalid cards');
  });
});
