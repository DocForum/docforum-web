// Price helpers for order issuance. docforum-core charges in stroops (1 XLM =
// 10,000,000 stroops) and requires EXACTLY ONE of a manual amount or a
// facility catalog code, so the conversion and the "exactly one" rule live
// here and are unit-tested.
import type { OrderPricingInput } from '../../types/models';

const STROOPS_PER_UNIT = 10_000_000n;
const XLM_PATTERN = /^\d+(\.\d{1,7})?$/;

/** `1.5` → `"15000000"`; null when not a positive amount with ≤ 7 decimals. */
export function xlmToStroops(value: string): string | null {
  const trimmed = value.trim();
  if (!XLM_PATTERN.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  const stroops =
    BigInt(whole) * STROOPS_PER_UNIT +
    BigInt(fraction.padEnd(7, '0') || '0');
  return stroops > 0n ? stroops.toString() : null;
}

export type PriceMode = 'catalog' | 'manual';

export type PricingResult =
  | { ok: true; pricing: OrderPricingInput }
  | { ok: false; error: string };

/** Builds the one pricing field the order body carries. */
export function resolvePricing(
  mode: PriceMode,
  catalogItemCode: string,
  amountXlm: string,
): PricingResult {
  if (mode === 'catalog') {
    const code = catalogItemCode.trim();
    if (!code) {
      return { ok: false, error: 'Enter the facility’s catalog item code.' };
    }
    if (code.length > 100) {
      return { ok: false, error: 'Catalog item codes are at most 100 characters.' };
    }
    return { ok: true, pricing: { catalogItemCode: code } };
  }

  const stroops = xlmToStroops(amountXlm);
  if (!stroops) {
    return {
      ok: false,
      error: 'Enter a positive amount in XLM with at most 7 decimal places.',
    };
  }
  return { ok: true, pricing: { amountStroops: stroops } };
}
