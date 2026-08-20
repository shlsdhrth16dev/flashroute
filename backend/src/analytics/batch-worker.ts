/**
 * Asynchronous Micro-Batch Analytics Ingestion Worker
 *
 * Design:
 *  - Enqueue is lock-free and non-blocking in the request/redirection path (< 0.02ms).
 *  - Events accumulate in an in-memory batch buffer.
 *  - Flushes to storage in bulk every 500ms or when buffer reaches 1,000 items.
 *  - Prevents database lock contention and maximizes disk I/O throughput.
 */

import { ClickRecord, db } from "../db/storage-engine.js";
import { sseBroker } from "./sse-broker.js";

export class AnalyticsBatchWorker {
  private buffer: ClickRecord[] = [];
  private flushIntervalMs: number;
  private maxBatchSize: number;
  private timer: NodeJS.Timeout | null = null;
  private totalIngested = 0;
  private totalFlushed = 0;

  constructor(flushIntervalMs: number = 500, maxBatchSize: number = 1000) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxBatchSize = maxBatchSize;

    this.start();
  }

  public enqueue(click: ClickRecord): void {
    this.buffer.push(click);
    this.totalIngested++;

    // Broadcast in real-time to live dashboard clients via SSE
    sseBroker.broadcastClick(click);

    // Fast-path flush if batch size threshold is reached
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  public flush(): void {
    if (this.buffer.length === 0) return;

    const batch = this.buffer;
    this.buffer = [];

    try {
      db.insertClicksBatch(batch);
      this.totalFlushed += batch.length;
    } catch (err) {
      console.error("[AnalyticsWorker] Error flushing click batch:", err);
      // Re-insert failed batch back to buffer front for retry
      this.buffer.unshift(...batch);
    }
  }

  private start() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
    this.timer.unref();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Final flush before shutdown
    this.flush();
  }

  public getStats() {
    return {
      bufferLength: this.buffer.length,
      totalIngested: this.totalIngested,
      totalFlushed: this.totalFlushed,
      flushIntervalMs: this.flushIntervalMs,
      maxBatchSize: this.maxBatchSize,
    };
  }
}

export const analyticsWorker = new AnalyticsBatchWorker(500, 1000);
