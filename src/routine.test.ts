import { describe, expect, it } from 'vitest';
import { cardsCsv, makeSession } from './routine';
import type { Card } from './types';

const card = (id: string, dueOn: string): Card => ({ id, dueOn, front: id, back: 'answer', language: '', note: '', status: 'active', createdAt: id, updatedAt: id });

describe('the finite daily routine', () => {
  it('takes only due cards in stable order and honours the daily limit', () => {
    expect(makeSession([card('later', '2026-09-01'), card('b', '2026-08-28'), card('a', '2026-08-27')], '2026-08-28', 2).cardIds).toEqual(['a', 'b']);
  });
  it('escapes card text in CSV exports', () => {
    expect(cardsCsv([{ ...card('one', '2026-08-28'), front: 'She said "hello"' }])).toContain('"She said ""hello"""');
  });
});
