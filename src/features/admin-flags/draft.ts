import { ROLES, describeRoles, shortId } from './flags';
import type { FeatureFlag, FeatureFlagTargeting, Role, UpdateFeatureFlagInput } from '../../types/models';
import type { Translator } from '../../i18n/useT';
import { englishTranslator } from '../../i18n/englishTranslator';

// The edit form works on strings (what the inputs hold) and only turns them
// into an UpdateFeatureFlagInput once everything validates. The review step
// renders the `changes` this produces, so what the admin confirms is exactly
// what gets sent.

export const MAX_ALLOWLIST = 500;

export interface FlagDraft {
  enabled: boolean;
  rolloutPercentage: string;
  roles: Role[];
  /** User ids separated by commas, spaces or new lines. */
  userIds: string;
}

export type DraftField = 'rolloutPercentage' | 'userIds';
export type DraftErrors = Partial<Record<DraftField, string>>;

export interface FlagChange {
  field: 'enabled' | 'rolloutPercentage' | 'roles' | 'userIds';
  label: string;
  before: string;
  after: string;
  detail?: string;
}

export type DraftReview =
  | { ok: false; errors: DraftErrors }
  | { ok: true; input: UpdateFeatureFlagInput; changes: FlagChange[]; next: FeatureFlag };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function draftFromFlag(flag: FeatureFlag): FlagDraft {
  return {
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage === null ? '' : String(flag.rolloutPercentage),
    roles: [...flag.targeting.roles],
    userIds: flag.targeting.userIds.join('\n'),
  };
}

/** Whole numbers 0–100 only: bucketing is per percent, so 12.5 would be
 * silently rounded by someone, somewhere. */
export function parsePercentage(raw: string, t: Translator = englishTranslator): { value: number } | { error: string } {
  const text = raw.trim();
  if (!text) return { error: t('adminFlags.validation.percentageRequired', 'Enter a percentage from 0 to 100.') };
  if (text.startsWith('-')) return { error: t('adminFlags.validation.percentageMin', 'The rollout can’t be below 0%.') };
  if (/^\d*[.,]\d+$/.test(text)) return { error: t('adminFlags.validation.percentageInteger', 'Use a whole number from 0 to 100.') };
  if (!/^\d+$/.test(text)) return { error: t('adminFlags.validation.percentageNumber', 'Enter a number from 0 to 100.') };
  const value = Number(text);
  if (value > 100) return { error: t('adminFlags.validation.percentageMax', 'The rollout can’t be above 100%.') };
  return { value };
}

/**
 * Splits, lower-cases and de-duplicates. Anything that isn't a user id is an
 * error rather than being dropped — a pasted email would otherwise quietly
 * target nobody. Ids already saved on the flag pass through untouched, so a
 * server-side id this check wouldn't accept can't block an unrelated edit.
 */
export function parseUserIds(raw: string, saved: string[] = [], t: Translator = englishTranslator): { ids: string[] } | { error: string } {
  const known = new Set(saved);
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  const invalid = tokens.filter((token) => !known.has(token) && !UUID_PATTERN.test(token));
  if (invalid.length > 0) {
    const sample = invalid.slice(0, 3).map((token) => `“${token.slice(0, 40)}”`).join(', ');
    const more = invalid.length > 3
      ? t('adminFlags.validation.userIdsMore', ' and {count} more', { count: invalid.length - 3 })
      : '';
    return {
      error: t('adminFlags.validation.userIdsInvalid', 'Not a user id: {sample}{more}. Paste user ids (UUIDs), not emails or names.', { sample, more }),
    };
  }
  const ids = [...new Set(tokens.map((token) => (known.has(token) ? token : token.toLowerCase())))];
  if (ids.length > MAX_ALLOWLIST) {
    return {
      error: t('adminFlags.validation.allowlistMax', 'Allowlist at most {max} users — use a role or a percentage for more.', { max: MAX_ALLOWLIST }),
    };
  }
  return { ids };
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function orderedRoles(roles: Role[]): Role[] {
  return ROLES.map((role) => role.value).filter((role) => roles.includes(role));
}

function usersLabel(count: number, t: Translator): string {
  if (count === 0) return t('adminFlags.review.nobody', 'Nobody');
  return t(count === 1 ? 'adminFlags.review.userOne' : 'adminFlags.review.userMany', count === 1 ? '{count} user' : '{count} users', { count });
}

function idList(ids: string[], t: Translator): string {
  const shown = ids.slice(0, 3).map(shortId).join(', ');
  return ids.length > 3
    ? t('adminFlags.review.idsMore', '{shown} and {count} more', { shown, count: ids.length - 3 })
    : shown;
}

function percentageLabel(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

/** The flag as it will be once `input` is saved — used for the review step
 * and for the optimistic cache entry. `updatedAt` is left alone on purpose:
 * only the server's answer may move it (see `useUpdateFeatureFlag`). */
export function applyUpdate(flag: FeatureFlag, input: UpdateFeatureFlagInput): FeatureFlag {
  return {
    ...flag,
    enabled: input.enabled ?? flag.enabled,
    rolloutPercentage: input.rolloutPercentage ?? flag.rolloutPercentage,
    targeting: input.targeting ?? flag.targeting,
  };
}

export function reviewDraft(flag: FeatureFlag, draft: FlagDraft, t: Translator = englishTranslator): DraftReview {
  const errors: DraftErrors = {};

  let rolloutPercentage: number | undefined;
  if (flag.kind === 'percentage') {
    const parsed = parsePercentage(draft.rolloutPercentage, t);
    if ('error' in parsed) errors.rolloutPercentage = parsed.error;
    else rolloutPercentage = parsed.value;
  }

  const parsedIds = parseUserIds(draft.userIds, flag.targeting.userIds, t);
  if ('error' in parsedIds) errors.userIds = parsedIds.error;

  if ('error' in parsedIds || errors.rolloutPercentage) return { ok: false, errors };

  const roles = orderedRoles(draft.roles);
  const userIds = parsedIds.ids;
  const input: UpdateFeatureFlagInput = { expectedUpdatedAt: flag.updatedAt };
  const changes: FlagChange[] = [];

  if (draft.enabled !== flag.enabled) {
    input.enabled = draft.enabled;
    changes.push({
      field: 'enabled',
      label: t('adminFlags.review.killSwitch', 'Kill switch'),
      before: flag.enabled ? t('adminFlags.review.enabled', 'Enabled') : t('adminFlags.review.disabled', 'Disabled'),
      after: draft.enabled ? t('adminFlags.review.enabled', 'Enabled') : t('adminFlags.review.disabled', 'Disabled'),
    });
  }

  if (rolloutPercentage !== undefined && rolloutPercentage !== flag.rolloutPercentage) {
    input.rolloutPercentage = rolloutPercentage;
    changes.push({
      field: 'rolloutPercentage',
      label: t('adminFlags.review.rollout', 'Rollout'),
      before: percentageLabel(flag.rolloutPercentage),
      after: percentageLabel(rolloutPercentage),
    });
  }

  const rolesChanged = !sameMembers(roles, flag.targeting.roles);
  const usersChanged = !sameMembers(userIds, flag.targeting.userIds);
  if (rolesChanged || usersChanged) {
    // Targeting is replaced as a whole, so both halves always go together.
    const targeting: FeatureFlagTargeting = { roles, userIds };
    input.targeting = targeting;
  }
  if (rolesChanged) {
    changes.push({
      field: 'roles',
      label: t('adminFlags.review.roles', 'Roles'),
      before: describeRoles(flag.targeting.roles, t),
      after: describeRoles(roles, t),
    });
  }
  if (usersChanged) {
    const before = new Set(flag.targeting.userIds);
    const after = new Set(userIds);
    const added = userIds.filter((id) => !before.has(id));
    const removed = flag.targeting.userIds.filter((id) => !after.has(id));
    changes.push({
      field: 'userIds',
      label: t('adminFlags.review.allowlist', 'Allowlist'),
      before: usersLabel(flag.targeting.userIds.length, t),
      after: usersLabel(userIds.length, t),
      detail: [
        added.length > 0 && t('adminFlags.review.adds', 'Adds {ids}', { ids: idList(added, t) }),
        removed.length > 0 && t('adminFlags.review.removes', 'Removes {ids}', { ids: idList(removed, t) }),
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  return { ok: true, input, changes, next: applyUpdate(flag, input) };
}
