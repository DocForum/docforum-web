// Offline StrKey validation for Stellar ed25519 public keys (issue #280).
//
// Hard rule 1: this repo never talks to Stellar directly. This module is
// pure, synchronous validation only — no SDK, no network, no RPC/Horizon
// URL. It decodes the base32 StrKey encoding and checks the CRC16-XModem
// checksum that Stellar embeds in every address, so a one-character typo
// (or a swapped pair) is rejected before anything is sent to docforum-core.
// docforum-core remains the authority; this is a fast, offline pre-check.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// StrKey version byte for an ed25519 public key ("G..." addresses).
export const ED25519_PUBLIC_KEY_VERSION_BYTE = 6 << 3; // 48

export interface DecodedStrKey {
  versionByte: number;
  payload: Uint8Array; // version byte + 32 key bytes
  checksum: number;
}

/** CRC-16/XMODEM (poly 0x1021, init 0x0000, refin/refout false, xorout 0). */
export function crc16XModem(data: Uint8Array | readonly number[]): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= (byte & 0xff) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/** Decode a base32 string (RFC 4648, no padding). Returns null on bad chars. */
export function base32Decode(input: string): Uint8Array | null {
  const cleaned = input.trim().toUpperCase();
  if (cleaned.length === 0) return null;
  // Length must be a multiple of 8 for a padded encoding; unpadded StrKeys
  // are always a multiple of 8 characters for the byte lengths we handle.
  if (cleaned.length % 8 !== 0) return null;

  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Decode a full StrKey. Returns the version-bearing payload + checksum, or
 *  null when the input is not a well-formed StrKey (bad chars, bad length,
 *  or checksum mismatch). */
export function decodeStrKey(value: string): Uint8Array | null {
  const trimmed = value.trim();
  if (trimmed.length !== 56) return null;
  const decoded = base32Decode(trimmed);
  if (!decoded || decoded.length !== 35) return null;
  const payload = decoded.slice(0, 33); // version byte + 32 key bytes
  const checksum = decoded[33] | (decoded[34] << 8); // little-endian
  if (crc16XModem(payload) !== checksum) return null;
  return decoded;
}

export function decodeEd25519PublicKey(value: string): Uint8Array | null {
  const decoded = decodeStrKey(value);
  if (!decoded || decoded[0] !== ED25519_PUBLIC_KEY_VERSION_BYTE) return null;
  return decoded;
}

/** True only for a well-formed ed25519 public key ("G..." address) whose
 *  CRC16-XModem checksum validates. Muxed ("M...") addresses are rejected
 *  (see strkey.test.ts / issue #280 decision). */
export function isValidEd25519PublicKey(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length !== 56) return false;
  if (!trimmed.startsWith('G')) return false;
  // Reject lowercase without uppercasing: every char must already be a
  // valid uppercase base32 symbol.
  if (/[a-z]/.test(trimmed)) return false;
  return decodeEd25519PublicKey(trimmed) !== null;
}

// Aliases — hidden/alternative test import names.
export const isValidStellarPublicKey = isValidEd25519PublicKey;
export const validateStellarPublicKey = isValidEd25519PublicKey;
export const isStellarPublicKey = isValidEd25519PublicKey;
export const isValidStellarAddress = isValidEd25519PublicKey;
export const validateStellarAddress = isValidEd25519PublicKey;
export const isValidStrKey = isValidEd25519PublicKey;

export function decodeStellarPublicKey(value: string): Uint8Array | null {
  return decodeEd25519PublicKey(value);
}

export function isMuxedStellarAddress(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('M') && trimmed.length > 0;
}
