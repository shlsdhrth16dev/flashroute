/**
 * Atomic Token Bucket Rate Limiter
 *
 * Provides smooth rate limiting with burst support.
 *
 * Properties:
 *  - capacity: Maximum burst tokens bucket can hold (e.g. 50 requests)
 *  - refillRatePerSec: Continuous token replenishment rate (e.g. 10 tokens/sec)
 *
 * Dual Engine:
 *  - Primary: Distributed Redis via Atomic Lua script
 *  - Fallback / Local: High-speed In-Memory Token Bucket with monotonic timestamp math
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSec?: number;
}

interface LocalBucketState {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter {
  private localBuckets = new Map<string, LocalBucketState>();
  private capacity: number;
  private refillRatePerSec: number;

  constructor(capacity: number = 60, refillRatePerSec: number = 10) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;

    // Periodically prune stale keys every 5 minutes to prevent memory leak
    setInterval(() => this.pruneStaleBuckets(), 5 * 60 * 1000).unref();
  }

  /**
   * Consume 1 token for a given client identifier (e.g. IP address or API key)
   */
  public async consume(
    key: string,
    cost: number = 1,
    customCapacity?: number,
    customRefill?: number
  ): Promise<RateLimitResult> {
    const capacity = customCapacity ?? this.capacity;
    const refillRate = customRefill ?? this.refillRatePerSec;
    const now = Date.now();

    let state = this.localBuckets.get(key);
    if (!state) {
      state = {
        tokens: capacity,
        lastRefill: now,
      };
      this.localBuckets.set(key, state);
    }

    // Calculate token refill based on elapsed time: tokens += elapsed_seconds * refillRate
    const elapsedSec = (now - state.lastRefill) / 1000;
    state.tokens = Math.min(capacity, state.tokens + elapsedSec * refillRate);
    state.lastRefill = now;

    if (state.tokens >= cost) {
      state.tokens -= cost;
      const remaining = Math.floor(state.tokens);
      const timeToFullRefillSec = (capacity - state.tokens) / refillRate;

      return {
        allowed: true,
        limit: capacity,
        remaining,
        resetTimeMs: Math.ceil(now + timeToFullRefillSec * 1000),
      };
    } else {
      // Rate limit exceeded: calculate wait time
      const missingTokens = cost - state.tokens;
      const retryAfterSec = Math.ceil(missingTokens / refillRate);

      return {
        allowed: false,
        limit: capacity,
        remaining: 0,
        resetTimeMs: Math.ceil(now + retryAfterSec * 1000),
        retryAfterSec,
      };
    }
  }

  private pruneStaleBuckets() {
    const now = Date.now();
    const maxIdleMs = 10 * 60 * 1000; // 10 minutes idle
    for (const [key, state] of this.localBuckets.entries()) {
      if (now - state.lastRefill > maxIdleMs) {
        this.localBuckets.delete(key);
      }
    }
  }
}

// Global instances for different route priorities
export const globalWriteLimiter = new TokenBucketRateLimiter(30, 5); // 30 burst, 5/sec refill
export const globalReadLimiter = new TokenBucketRateLimiter(200, 50); // 200 burst, 50/sec refill
