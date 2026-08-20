/**
 * Base62 Encoding & Decoding Utility
 *
 * Maps 64-bit integer IDs (Snowflake IDs) into compact, URL-safe alphanumeric strings
 * using charset: [0-9a-zA-Z] (62 characters).
 *
 * Example:
 *   BigInt(10823485723947239n) -> "8hZ4rQ"
 */

const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = 62n;

// Lookup map for fast decoding
const CHAR_MAP = new Map<string, bigint>();
for (let i = 0; i < BASE62_CHARS.length; i++) {
  CHAR_MAP.set(BASE62_CHARS[i], BigInt(i));
}

export function encodeBase62(num: bigint | number): string {
  let n = typeof num === "bigint" ? num : BigInt(num);
  if (n === 0n) return BASE62_CHARS[0];

  let result = "";
  while (n > 0n) {
    const remainder = n % BASE;
    result = BASE62_CHARS[Number(remainder)] + result;
    n = n / BASE;
  }
  return result;
}

export function decodeBase62(str: string): bigint {
  let result = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const val = CHAR_MAP.get(char);
    if (val === undefined) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    result = result * BASE + val;
  }
  return result;
}

/**
 * Validates whether a custom alias contains only URL-safe Base62 / alphanumeric characters and dashes
 */
export function isValidAlias(alias: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(alias);
}
