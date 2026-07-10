import { randomBytes } from 'crypto';

/**
 * Generates a standard-compliant UUID v7.
 * UUID v7 contains a 48-bit timestamp in milliseconds, a 4-bit version (7),
 * a 2-bit variant (2/RFC 4122), and 74 random bits.
 */
export function generateUuidV7(): string {
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Generate random bytes for the remaining parts
  const random = randomBytes(10);

  // version 7 (0111) -> 0x7000 + 12-bit random (from bytes 0 and 1)
  const verAndRandHex = (0x7000 | (random.readUInt16BE(0) & 0x0fff))
    .toString(16)
    .padStart(4, '0');

  // variant (10xx) -> 0x80 + 6-bit random (from byte 2)
  const variant = (random.readUInt8(2) & 0x3f) | 0x80;
  const varAndRandHex =
    variant.toString(16).padStart(2, '0') + random.toString('hex', 3, 10);

  return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-${verAndRandHex}-${varAndRandHex.slice(0, 4)}-${varAndRandHex.slice(4)}`;
}
