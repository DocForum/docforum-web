// Stroops -> XLM display, in BigInt only.
//
// docforum-core sends `amountStroops` as a string because the column is a
// BigInt (see its payments/controllers serializeIntent). Going through a JS
// `number` would silently round anything over 2^53 stroops, so every step
// here stays in BigInt and string manipulation.
const STROOPS_PER_LUMEN = 10_000_000n;
const DECIMAL_PLACES = 7;

/** `1234.56789` — no trailing zeros, thousands separators, never a float.
 * Returns null for anything that isn't a plain non-negative integer string,
 * so callers show the raw value rather than a made-up number. */
export function formatStroopsAsLumens(stroops: string): string | null {
  if (!/^\d+$/.test(stroops)) return null;

  const whole = BigInt(stroops) / STROOPS_PER_LUMEN;
  const fraction = BigInt(stroops) % STROOPS_PER_LUMEN;
  const wholePart = groupThousands(whole.toString());

  if (fraction === 0n) return wholePart;
  const decimals = fraction.toString().padStart(DECIMAL_PLACES, '0').replace(/0+$/, '');
  return `${wholePart}.${decimals}`;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Every amount shown to a patient carries its unit, so a value this helper
 * cannot parse is still readable instead of silently wrong. */
export function amountLabel(stroops: string): string {
  const lumens = formatStroopsAsLumens(stroops);
  return lumens === null ? `${stroops} stroops` : `${lumens} XLM`;
}
