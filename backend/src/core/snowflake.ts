/**
 * Distributed 64-Bit Snowflake ID Generator
 *
 * Bit Allocation:
 *  - 1 bit: Sign bit (reserved, always 0)
 *  - 41 bits: Timestamp in milliseconds (gives ~69 years from EPOCH)
 *  - 10 bits: Worker / Node ID (supports up to 1024 distinct worker nodes)
 *  - 12 bits: Sequence counter (supports up to 4096 IDs per millisecond per node)
 *
 * Theoretical Max Throughput: 4,096,000 IDs/sec per node with ZERO collisions.
 */

export class Snowflake {
  // Custom Epoch: 2026-01-01 00:00:00 UTC (1767225600000 ms)
  private readonly epoch: bigint = 1767225600000n;

  private readonly workerIdBits = 10n;
  private readonly sequenceBits = 12n;

  private readonly maxWorkerId = (1n << this.workerIdBits) - 1n; // 1023
  private readonly maxSequence = (1n << this.sequenceBits) - 1n; // 4095

  private readonly workerIdShift = this.sequenceBits; // 12
  private readonly timestampLeftShift = this.sequenceBits + this.workerIdBits; // 22

  private workerId: bigint;
  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  constructor(workerId: number = 1) {
    const id = BigInt(workerId);
    if (id < 0n || id > this.maxWorkerId) {
      throw new Error(`Worker ID must be between 0 and ${this.maxWorkerId}`);
    }
    this.workerId = id;
  }

  public nextId(): bigint {
    let timestamp = this.timeGen();

    if (timestamp < this.lastTimestamp) {
      // Clock moved backwards, handle clock skew
      const offset = this.lastTimestamp - timestamp;
      if (offset <= 5n) {
        // Wait until clock catches up
        timestamp = this.tilNextMillis(this.lastTimestamp);
      } else {
        throw new Error(`Clock moved backwards. Refusing to generate ID for ${offset}ms`);
      }
    }

    if (this.lastTimestamp === timestamp) {
      // Same millisecond: increment sequence
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      if (this.sequence === 0n) {
        // Sequence exhausted for this millisecond: wait for next millisecond
        timestamp = this.tilNextMillis(this.lastTimestamp);
      }
    } else {
      // New millisecond: reset sequence counter
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - this.epoch) << this.timestampLeftShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence
    );
  }

  private tilNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.timeGen();
    while (timestamp <= lastTimestamp) {
      timestamp = this.timeGen();
    }
    return timestamp;
  }

  private timeGen(): bigint {
    return BigInt(Date.now());
  }

  /**
   * Helper to decompose and inspect a generated Snowflake ID
   */
  public decompose(id: bigint) {
    const sequence = id & this.maxSequence;
    const workerId = (id >> this.workerIdShift) & this.maxWorkerId;
    const timestamp = (id >> this.timestampLeftShift) + this.epoch;

    return {
      id: id.toString(),
      timestamp: Number(timestamp),
      date: new Date(Number(timestamp)).toISOString(),
      workerId: Number(workerId),
      sequence: Number(sequence),
    };
  }
}

// Global default singleton instance
export const defaultSnowflake = new Snowflake(1);
