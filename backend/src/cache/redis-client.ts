/**
 * Redis L2 Cache Client & In-Memory Distributed Simulator
 *
 * Supports connection to a real Redis server (via REDIS_URL env),
 * or falls back seamlessly to an in-memory L2 cluster cache simulator.
 */

import Redis from "ioredis";

export interface L2CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  isLiveRedis(): boolean;
  getStats(): { type: string; hits: number; misses: number; keysCount: number };
}

class SimulatedL2Cache implements L2CacheInterface {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private hits = 0;
  private misses = 0;

  public async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) {
      this.misses++;
      return null;
    }
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  public isLiveRedis(): boolean {
    return false;
  }

  public getStats() {
    return {
      type: "In-Memory L2 Cluster Simulator",
      hits: this.hits,
      misses: this.misses,
      keysCount: this.store.size,
    };
  }
}

class LiveRedisClient implements L2CacheInterface {
  private client: Redis;
  private hits = 0;
  private misses = 0;

  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });

    this.client.on("error", (err) => {
      console.warn("[Redis L2] Redis connection error, operating with resilience:", err.message);
    });
  }

  public async get(key: string): Promise<string | null> {
    try {
      const res = await this.client.get(key);
      if (res) {
        this.hits++;
        return res;
      }
      this.misses++;
      return null;
    } catch {
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    try {
      await this.client.set(key, value, "EX", ttlSeconds);
    } catch (err) {
      console.warn("[Redis L2] Failed to set key:", err);
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {}
  }

  public isLiveRedis(): boolean {
    return true;
  }

  public getStats() {
    return {
      type: "Live Redis Cluster",
      hits: this.hits,
      misses: this.misses,
      keysCount: 0,
    };
  }
}

export function createL2Cache(): L2CacheInterface {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      console.log(`[Cache] Initializing Live Redis Client at ${redisUrl}`);
      return new LiveRedisClient(redisUrl);
    } catch {
      console.warn("[Cache] Failed to initialize Redis, falling back to simulated L2");
    }
  }
  return new SimulatedL2Cache();
}

export const l2Cache = createL2Cache();
