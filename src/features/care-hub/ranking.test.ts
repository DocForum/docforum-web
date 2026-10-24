import { describe, expect, it } from 'vitest';
import { groupBySection, PRIORITY, rankCards, type CareCard } from './ranking';

function card(overrides: Partial<CareCard>): CareCard {
  return {
    id: overrides.id ?? 'card',
    section: overrides.section ?? 'action',
    priority: overrides.priority ?? PRIORITY.needsYou,
    title: overrides.title ?? 'Card',
    detail: 'detail',
    to: '/patient',
    ...overrides,
  };
}

describe('rankCards', () => {
  it('sorts by ascending priority so the most urgent action is first', () => {
    const ranked = rankCards([
      card({ id: 'later', priority: PRIORITY.goodToKnow, title: 'Add allergies' }),
      card({ id: 'urgent', priority: PRIORITY.blockedNow, title: 'Resend invite' }),
      card({ id: 'middle', priority: PRIORITY.needsYou, title: 'Start handover' }),
    ]);

    expect(ranked.map((c) => c.id)).toEqual(['urgent', 'middle', 'later']);
  });

  it('breaks priority ties alphabetically for a stable order', () => {
    const ranked = rankCards([
      card({ id: 'zoe', title: 'Zoe', priority: PRIORITY.needsYou }),
      card({ id: 'amy', title: 'Amy', priority: PRIORITY.needsYou }),
    ]);

    expect(ranked.map((c) => c.title)).toEqual(['Amy', 'Zoe']);
  });

  it('does not mutate the input', () => {
    const input = [card({ id: 'b', priority: 2 }), card({ id: 'a', priority: 1 })];

    rankCards(input);

    expect(input.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('groupBySection', () => {
  it('splits cards into the three hub sections, each ranked', () => {
    const grouped = groupBySection([
      card({ id: 'r2', section: 'recent', priority: PRIORITY.recent, title: 'B' }),
      card({ id: 'a1', section: 'action', priority: PRIORITY.needsYou, title: 'A' }),
      card({ id: 'r1', section: 'recent', priority: PRIORITY.recent, title: 'A' }),
      card({ id: 'u1', section: 'upcoming', priority: PRIORITY.needsYou, title: 'U' }),
    ]);

    expect(grouped.action.map((c) => c.id)).toEqual(['a1']);
    expect(grouped.upcoming.map((c) => c.id)).toEqual(['u1']);
    expect(grouped.recent.map((c) => c.id)).toEqual(['r1', 'r2']);
  });

  it('returns empty arrays rather than omitting sections with no cards', () => {
    const grouped = groupBySection([]);

    expect(grouped).toEqual({ action: [], upcoming: [], recent: [] });
  });
});
