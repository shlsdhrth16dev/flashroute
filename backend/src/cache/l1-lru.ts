/**
 * High-Speed L1 In-Memory LRU Cache with TTL
 *
 * Provides sub-millisecond in-process cache lookup for hot URLs.
 * Uses a doubly linked list + Map for true O(1) reads, updates, and evictions.
 */

interface LRUNode<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

export class L1LRUCache<T> {
  private capacity: number;
  private ttlMs: number;
  private cache = new Map<string, LRUNode<T>>();

  // Doubly linked list pointers
  private head: LRUNode<T> | null = null;
  private tail: LRUNode<T> | null = null;

  // Telemetry metrics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(capacity: number = 10000, ttlMs: number = 5 * 60 * 1000) {
    this.capacity = capacity;
    this.ttlMs = ttlMs;
  }

  public get(key: string): T | null {
    const node = this.cache.get(key);
    if (!node) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > node.expiresAt) {
      this.removeNode(node);
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to front (most recently used)
    this.moveToHead(node);
    this.hits++;
    return node.value;
  }

  public set(key: string, value: T, customTtlMs?: number): void {
    const ttl = customTtlMs ?? this.ttlMs;
    const expiresAt = Date.now() + ttl;

    const existing = this.cache.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.moveToHead(existing);
      return;
    }

    // Check capacity before adding new node
    if (this.cache.size >= this.capacity) {
      this.evictTail();
    }

    const newNode: LRUNode<T> = {
      key,
      value,
      expiresAt,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;
    if (!this.tail) {
      this.tail = newNode;
    }

    this.cache.set(key, newNode);
  }

  public delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  public clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  public getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRatio: total > 0 ? ((this.hits / total) * 100).toFixed(2) + "%" : "0%",
    };
  }

  private moveToHead(node: LRUNode<T>) {
    if (node === this.head) return;

    this.removeNode(node);

    node.next = this.head;
    node.prev = null;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<T>) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictTail() {
    if (!this.tail) return;
    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);
    this.evictions++;
  }
}

export const l1Cache = new L1LRUCache<string>(10000, 10 * 60 * 1000); // 10k items, 10 min TTL
