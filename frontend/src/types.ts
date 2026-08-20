export interface UrlRecord {
  id: string;
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

export interface SystemMetrics {
  timestamp: number;
  uptimeSeconds: number;
  system: {
    nodeVersion: string;
    platform: string;
    cpuCount: number;
    freeMemMB: number;
    totalMemMB: number;
  };
  processMemory: {
    rssMB: string;
    heapUsedMB: string;
    heapTotalMB: string;
  };
  cacheTelemetry: {
    l1: {
      size: number;
      capacity: number;
      hits: number;
      misses: number;
      evictions: number;
      hitRatio: string;
    };
    l2: {
      type: string;
      hits: number;
      misses: number;
      keysCount: number;
    };
    singleflight: {
      totalCalls: number;
      coalescedCalls: number;
      activeInFlight: number;
      stampedeMitigationRate: string;
    };
  };
  analyticsQueue: {
    bufferLength: number;
    totalIngested: number;
    totalFlushed: number;
    flushIntervalMs: number;
    maxBatchSize: number;
  };
  connectedLiveClients: number;
  databaseStats: {
    totalUrls: number;
    totalClicks: number;
  };
}
