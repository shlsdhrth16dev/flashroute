/**
 * System Telemetry & Observability Metrics
 *
 * GET /api/metrics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import os from "os";
import { cacheManager } from "../cache/cache-manager.js";
import { analyticsWorker } from "../analytics/batch-worker.js";
import { sseBroker } from "../analytics/sse-broker.js";
import { db } from "../db/storage-engine.js";

const serverStartTime = Date.now();

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get("/api/metrics", async (_req: FastifyRequest, reply: FastifyReply) => {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - serverStartTime) / 1000);

    return reply.send({
      success: true,
      timestamp: Date.now(),
      uptimeSeconds: uptimeSec,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuCount: os.cpus().length,
        freeMemMB: Math.round(os.freemem() / 1024 / 1024),
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
      },
      processMemory: {
        rssMB: (memory.rss / 1024 / 1024).toFixed(2),
        heapUsedMB: (memory.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (memory.heapTotal / 1024 / 1024).toFixed(2),
      },
      cacheTelemetry: cacheManager.getTelemetry(),
      analyticsQueue: analyticsWorker.getStats(),
      connectedLiveClients: sseBroker.getConnectedClientsCount(),
      databaseStats: db.getGlobalStats(),
    });
  });
}
