export type CareSection = 'action' | 'upcoming' | 'recent';

export interface CareCard {
  id: string;
  section: CareSection;
  /** Lower sorts first: the hub answers "what do I do next", so the most
   * time-critical thing the patient can still act on ranks highest. */
  priority: number;
  title: string;
  detail: string;
  to: string;
  badge?: string;
}

export const PRIORITY = {
  blockedNow: 10,
  needsYou: 20,
  goodToKnow: 30,
  recent: 40,
} as const;

export function rankCards(cards: CareCard[]): CareCard[] {
  return [...cards].sort((a, b) => (a.priority - b.priority) || a.title.localeCompare(b.title));
}

export function groupBySection(cards: CareCard[]): Record<CareSection, CareCard[]> {
  const ranked = rankCards(cards);
  return {
    action: ranked.filter((card) => card.section === 'action'),
    upcoming: ranked.filter((card) => card.section === 'upcoming'),
    recent: ranked.filter((card) => card.section === 'recent'),
  };
}
