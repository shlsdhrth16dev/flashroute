/**
 * Multi-Tier Hierarchical Cache Manager
 *
 * Tier Hierarchy:
 *  1. Bloom Filter (Negative check: Reject non-existent keys in O(1) CPU cycles)
 *  2. L1 In-Memory LRU Cache (< 0.05ms)
 *  3. Singleflight Group (Thundering Herd Protection for in-flight requests)
 *  4. L2 Distributed Cache (Redis / Shared Store) (< 0.5ms)
 *  5. Persistent Database Storage Engine
 */

import { bloomFilter } from "../core/bloom.js";
import { singleflight } from "../core/singleflight.js";
import { l1Cache } from "./l1-lru.js";
import { l2Cache } from "./redis-client.js";
import { db } from "../db/storage-engine.js";

export interface CacheResolution {
  originalUrl: string | null;
  tier: "L1_HIT" | "L2_HIT" | "DB_HIT" | "BLOOM_REJECTED" | "NOT_FOUND";
  latencyMs: number;
  shared: boolean;
}

export class CacheManager {
  /**
   * Resolves a short code to its original URL using the multi-tier hierarchy
   */
  public async resolveUrl(shortCode: string): Promise<CacheResolution> {
    const startTime = performance.now();

    // Step 1: Bloom Filter Check (Cache Penetration Prevention)
    if (!bloomFilter.has(shortCode)) {
      // Even if Bloom filter says no, double check in-memory to account for restarts
      if (!db.exists(shortCode)) {
        return {
          originalUrl: null,
          tier: "BLOOM_REJECTED",
          latencyMs: Number((performance.now() - startTime).toFixed(3)),
          shared: false,
        };
      }
    }

    // Step 2: Check L1 In-Memory LRU Cache (Fastest: < 0.05ms)
    const l1Result = l1Cache.get(shortCode);
    if (l1Result) {
      return {
        originalUrl: l1Result,
        tier: "L1_HIT",
        latencyMs: Number((performance.now() - startTime).toFixed(3)),
        shared: false,
      };
    }

    // Step 3: Singleflight Coalesced DB / L2 Fetch (Thundering Herd Prevention)
    const { val, shared } = await singleflight.do(`resolve:${shortCode}`, async () => {
      // Step 3a: Check L2 Redis Cache
      const l2Result = await l2Cache.get(`url:${shortCode}`);
      if (l2Result) {
        // Populate L1 cache with jittered TTL (8-12 minutes)
        const jitterTtl = (8 + Math.random() * 4) * 60 * 1000;
        l1Cache.set(shortCode, l2Result, jitterTtl);

        return {
          originalUrl: l2Result,
          tier: "L2_HIT" as const,
        };
      }

      // Step 3b: Query Persistent Storage Engine
      const record = db.getUrlByCode(shortCode);
      if (!record) {
        return {
          originalUrl: null,
          tier: "NOT_FOUND" as const,
        };
      }

      const targetUrl = record.originalUrl;

      // Populate both L1 and L2 caches
      const jitterTtlMs = (8 + Math.random() * 4) * 60 * 1000;
      l1Cache.set(shortCode, targetUrl, jitterTtlMs);
      await l2Cache.set(`url:${shortCode}`, targetUrl, 3600); // 1 hour L2 TTL

      return {
        originalUrl: targetUrl,
        tier: "DB_HIT" as const,
      };
    });

    const elapsed = Number((performance.now() - startTime).toFixed(3));

    return {
      originalUrl: val.originalUrl,
      tier: val.tier,
      latencyMs: elapsed,
      shared,
    };
  }

  /**
   * Warm the cache and bloom filter when a new short URL is created
   */
  public async setShortUrl(shortCode: string, originalUrl: string): Promise<void> {
    bloomFilter.add(shortCode);
    l1Cache.set(shortCode, originalUrl);
    await l2Cache.set(`url:${shortCode}`, originalUrl, 3600);
  }

  /**
   * Invalidate all cache tiers when a URL is deleted or modified
   */
  public async invalidate(shortCode: string): Promise<void> {
    l1Cache.delete(shortCode);
    await l2Cache.del(`url:${shortCode}`);
  }

  public getTelemetry() {
    return {
      l1: l1Cache.getStats(),
      l2: l2Cache.getStats(),
      singleflight: singleflight.getStats(),
    };
  }
}

export const cacheManager = new CacheManager();
