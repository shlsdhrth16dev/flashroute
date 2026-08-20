/**
 * In-Memory BitSet Bloom Filter
 *
 * Prevents "Cache Penetration Attacks".
 * If malicious actors or crawlers request millions of random non-existent short codes
 * (e.g. GET /nonExistent999), without a Bloom filter every request bypasses cache
 * and hits the persistent database.
 *
 * The Bloom Filter tests membership probabilistically in O(k) CPU cycles:
 * - If Bloom filter returns FALSE -> The short code definitely DOES NOT exist (reject immediately, 404).
 * - If Bloom filter returns TRUE -> The short code MIGHT exist (proceed to L1/L2/DB).
 */

export class BloomFilter {
  private size: number;
  private bitArray: Uint8Array;
  private numHashFunctions: number;

  constructor(expectedItems: number = 100000, falsePositiveRate: number = 0.01) {
    // Optimal m = - (n * ln(p)) / (ln(2)^2)
    this.size = Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2));
    // Optimal k = (m / n) * ln(2)
    this.numHashFunctions = Math.ceil((this.size / expectedItems) * Math.LN2);

    // Byte array representing bitset (size / 8 bytes)
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  public add(key: string): void {
    const hashes = this.getHashes(key);
    for (const bitIndex of hashes) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitArray[byteIndex] |= 1 << bitOffset;
    }
  }

  public has(key: string): boolean {
    const hashes = this.getHashes(key);
    for (const bitIndex of hashes) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false; // Definitely does not exist
      }
    }
    return true; // May exist
  }

  /**
   * Generates k hash values using Kirsch-Mitzenmacher optimization:
   * hash(i) = (hash1 + i * hash2) % size
   */
  private getHashes(key: string): number[] {
    const hash1 = this.fnv1a(key);
    const hash2 = this.murmurLike(key);
    const hashes: number[] = [];

    for (let i = 0; i < this.numHashFunctions; i++) {
      const combined = Math.abs((hash1 + i * hash2) % this.size);
      hashes.push(combined);
    }
    return hashes;
  }

  private fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private murmurLike(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }
}

export const bloomFilter = new BloomFilter(100000, 0.01);
