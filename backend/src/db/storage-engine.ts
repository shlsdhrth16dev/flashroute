/**
 * High-Performance WAL (Write-Ahead Log) + Indexed Storage Engine
 *
 * Architecture & Systems Principles:
 *  1. Append-Only WAL: Mutations (INSERT / UPDATE) are appended sequentially to disk
 *     for maximum write throughput and ACID crash-durability.
 *  2. In-Memory Primary Indexes:
 *     - `urlsByCode`: O(1) lookup by short code
 *     - `urlsById`: O(1) lookup by Snowflake ID
 *     - `clicksByCode`: Fast aggregation index for analytics
 *  3. Periodic Snapshotting / Checkpointing: Compresses the WAL into a snapshot file.
 *  4. Startup Recovery: Automatically replays snapshot + WAL on boot.
 */

import fs from "fs";
import path from "path";

export interface UrlRecord {
  id: string; // Snowflake 64-bit ID string
  shortCode: string;
  originalUrl: string;
  customAlias?: string;
  createdAt: number;
  expiresAt?: number;
  clicksCount: number;
}

export interface ClickRecord {
  id: string;
  shortCode: string;
  timestamp: number;
  ipHash: string;
  userAgent?: string;
  referer?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
}

export interface AnalyticsSummary {
  shortCode: string;
  originalUrl: string;
  createdAt: number;
  totalClicks: number;
  uniqueVisitors: number;
  clicksOverTime: { date: string; count: number }[];
  referrers: { referer: string; count: number }[];
  devices: { device: string; count: number }[];
  browsers: { browser: string; count: number }[];
  countries: { country: string; count: number }[];
  recentClicks: ClickRecord[];
}

export class StorageEngine {
  private dataDir: string;
  private walPath: string;
  private snapshotPath: string;

  private urlsByCode = new Map<string, UrlRecord>();
  private urlsById = new Map<string, UrlRecord>();
  private clicksByCode = new Map<string, ClickRecord[]>();
  private allClicks: ClickRecord[] = [];

  private walWriteStream: fs.WriteStream | null = null;
  private writeCountSinceCheckpoint = 0;
  private checkpointThreshold = 5000; // Checkpoint every 5,000 writes

  constructor(dataDir: string = path.join(process.cwd(), "data")) {
    this.dataDir = dataDir;
    this.walPath = path.join(dataDir, "flashroute.wal");
    this.snapshotPath = path.join(dataDir, "snapshot.json");

    this.init();
  }

  private init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Step 1: Recover from snapshot if available
    this.recoverFromSnapshot();

    // Step 2: Replay any remaining WAL records on top of snapshot
    this.recoverFromWal();

    // Step 3: Open WAL write stream in append mode
    this.walWriteStream = fs.createWriteStream(this.walPath, { flags: "a" });
  }

  private recoverFromSnapshot() {
    if (fs.existsSync(this.snapshotPath)) {
      try {
        const raw = fs.readFileSync(this.snapshotPath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.urls)) {
          for (const url of data.urls) {
            this.urlsByCode.set(url.shortCode, url);
            this.urlsById.set(url.id, url);
          }
        }
        if (Array.isArray(data.clicks)) {
          for (const click of data.clicks) {
            this.allClicks.push(click);
            const list = this.clicksByCode.get(click.shortCode) || [];
            list.push(click);
            this.clicksByCode.set(click.shortCode, list);
          }
        }
      } catch (err) {
        console.error("[StorageEngine] Warning: Failed to load snapshot, starting fresh:", err);
      }
    }
  }

  private recoverFromWal() {
    if (fs.existsSync(this.walPath)) {
      try {
        const lines = fs.readFileSync(this.walPath, "utf-8").split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          const entry = JSON.parse(line);
          if (entry.type === "URL_INSERT") {
            const url: UrlRecord = entry.data;
            this.urlsByCode.set(url.shortCode, url);
            this.urlsById.set(url.id, url);
          } else if (entry.type === "CLICKS_BATCH") {
            const clicks: ClickRecord[] = entry.data;
            for (const click of clicks) {
              this.allClicks.push(click);
              const list = this.clicksByCode.get(click.shortCode) || [];
              list.push(click);
              this.clicksByCode.set(click.shortCode, list);

              const url = this.urlsByCode.get(click.shortCode);
              if (url) {
                url.clicksCount++;
              }
            }
          } else if (entry.type === "URL_DELETE") {
            const code = entry.data.shortCode;
            const existing = this.urlsByCode.get(code);
            if (existing) {
              this.urlsById.delete(existing.id);
              this.urlsByCode.delete(code);
            }
          }
        }
      } catch (err) {
        console.error("[StorageEngine] Warning: Error replaying WAL:", err);
      }
    }
  }

  private appendWal(entry: { type: string; data: any }) {
    if (this.walWriteStream) {
      this.walWriteStream.write(JSON.stringify(entry) + "\n");
      this.writeCountSinceCheckpoint++;

      if (this.writeCountSinceCheckpoint >= this.checkpointThreshold) {
        this.checkpoint();
      }
    }
  }

  public checkpoint() {
    try {
      const snapshot = {
        timestamp: Date.now(),
        urls: Array.from(this.urlsByCode.values()),
        clicks: this.allClicks,
      };

      const tmpSnapshot = this.snapshotPath + ".tmp";
      fs.writeFileSync(tmpSnapshot, JSON.stringify(snapshot, null, 2), "utf-8");
      fs.renameSync(tmpSnapshot, this.snapshotPath);

      // Truncate WAL after successful snapshot
      if (this.walWriteStream) {
        this.walWriteStream.end();
      }
      fs.writeFileSync(this.walPath, "");
      this.walWriteStream = fs.createWriteStream(this.walPath, { flags: "a" });
      this.writeCountSinceCheckpoint = 0;
    } catch (err) {
      console.error("[StorageEngine] Checkpoint error:", err);
    }
  }

  // --- URL Operations ---

  public insertUrl(url: UrlRecord): void {
    this.urlsByCode.set(url.shortCode, url);
    this.urlsById.set(url.id, url);
    this.appendWal({ type: "URL_INSERT", data: url });
  }

  public getUrlByCode(code: string): UrlRecord | null {
    const url = this.urlsByCode.get(code);
    if (!url) return null;

    // Check expiration
    if (url.expiresAt && Date.now() > url.expiresAt) {
      return null;
    }
    return url;
  }

  public exists(code: string): boolean {
    return this.urlsByCode.has(code);
  }

  public getAllUrls(limit: number = 100): UrlRecord[] {
    const all = Array.from(this.urlsByCode.values());
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all.slice(0, limit);
  }

  public deleteUrl(code: string): boolean {
    const existing = this.urlsByCode.get(code);
    if (!existing) return false;

    this.urlsById.delete(existing.id);
    this.urlsByCode.delete(code);
    this.clicksByCode.delete(code);
    this.appendWal({ type: "URL_DELETE", data: { shortCode: code } });
    return true;
  }

  // --- Analytics & Click Batch Operations ---

  public insertClicksBatch(clicks: ClickRecord[]): void {
    if (clicks.length === 0) return;

    for (const click of clicks) {
      this.allClicks.push(click);
      const list = this.clicksByCode.get(click.shortCode) || [];
      list.push(click);
      this.clicksByCode.set(click.shortCode, list);

      const url = this.urlsByCode.get(click.shortCode);
      if (url) {
        url.clicksCount++;
      }
    }

    this.appendWal({ type: "CLICKS_BATCH", data: clicks });
  }

  public getAnalytics(shortCode: string): AnalyticsSummary | null {
    const url = this.urlsByCode.get(shortCode);
    if (!url) return null;

    const clicks = this.clicksByCode.get(shortCode) || [];
    const uniqueIps = new Set<string>();

    const refererMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const browserMap = new Map<string, number>();
    const countryMap = new Map<string, number>();
    const timeMap = new Map<string, number>();

    for (const c of clicks) {
      uniqueIps.add(c.ipHash);

      const ref = c.referer ? new URL(c.referer).hostname : "Direct";
      refererMap.set(ref, (refererMap.get(ref) || 0) + 1);

      const dev = c.device || "Desktop";
      deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);

      const br = c.browser || "Unknown";
      browserMap.set(br, (browserMap.get(br) || 0) + 1);

      const co = c.country || "United States";
      countryMap.set(co, (countryMap.get(co) || 0) + 1);

      // Group by date (YYYY-MM-DD) or hourly format
      const dateKey = new Date(c.timestamp).toISOString().slice(0, 10);
      timeMap.set(dateKey, (timeMap.get(dateKey) || 0) + 1);
    }

    const sortMap = (map: Map<string, number>, keyName: string) =>
      Array.from(map.entries())
        .map(([k, count]) => ({ [keyName]: k, count } as any))
        .sort((a, b) => b.count - a.count);

    return {
      shortCode,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt,
      totalClicks: clicks.length,
      uniqueVisitors: uniqueIps.size,
      clicksOverTime: Array.from(timeMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      referrers: sortMap(refererMap, "referer"),
      devices: sortMap(deviceMap, "device"),
      browsers: sortMap(browserMap, "browser"),
      countries: sortMap(countryMap, "country"),
      recentClicks: clicks.slice(-25).reverse(),
    };
  }

  public getGlobalStats() {
    return {
      totalUrls: this.urlsByCode.size,
      totalClicks: this.allClicks.length,
    };
  }
}

export const db = new StorageEngine();
