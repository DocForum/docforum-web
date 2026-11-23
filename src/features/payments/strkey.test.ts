import { describe, expect, it } from 'vitest';
import {
  crc16XModem,
  decodeStrKey,
  isValidEd25519PublicKey,
  isValidStellarPublicKey,
} from './strkey';

const VALID_KEY = 'GA2HDLPTODEIM2UGOY4AQ4WNTAG4MFO7MTV7ZNUV6DJI3VSFW7YCZQ26';

describe('isValidStellarPublicKey (StrKey checksum)', () => {
  it('accepts a valid ed25519 public key', () => {
    expect(isValidStellarPublicKey(VALID_KEY)).toBe(true);
    expect(isValidEd25519PublicKey(VALID_KEY)).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(isValidStellarPublicKey(`  ${VALID_KEY}  `)).toBe(true);
  });

  it('rejects a one-character typo', () => {
    const typo = VALID_KEY.slice(0, -1) + (VALID_KEY.endsWith('6') ? '7' : '6');
    expect(isValidStellarPublicKey(typo)).toBe(false);
  });

  it('rejects a swapped adjacent pair', () => {
    const swapped = VALID_KEY.slice(0, 10) + VALID_KEY[11] + VALID_KEY[10] + VALID_KEY.slice(12);
    expect(isValidStellarPublicKey(swapped)).toBe(false);
  });

  it('rejects lowercase input instead of uppercasing', () => {
    expect(isValidStellarPublicKey(VALID_KEY.toLowerCase())).toBe(false);
  });

  it('rejects muxed (M...) addresses', () => {
    expect(isValidStellarPublicKey('M' + 'A'.repeat(68))).toBe(false);
  });

  it('rejects wrong length and wrong prefix', () => {
    expect(isValidStellarPublicKey('G' + 'A'.repeat(54))).toBe(false);
    expect(isValidStellarPublicKey('S' + VALID_KEY.slice(1))).toBe(false);
  });

  it('decodeStrKey returns 35 bytes for a valid key and null for a typo', () => {
    const decoded = decodeStrKey(VALID_KEY);
    expect(decoded).not.toBeNull();
    expect(decoded?.length).toBe(35);
    expect(decoded?.[0]).toBe(48);
    const typo = VALID_KEY.slice(0, -1) + (VALID_KEY.endsWith('6') ? '7' : '6');
    expect(decodeStrKey(typo)).toBeNull();
  });

  it('crc16XModem is deterministic', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(crc16XModem(bytes)).toBe(crc16XModem(bytes));
  });
});
