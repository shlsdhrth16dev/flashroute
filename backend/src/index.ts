/**
 * FlashRoute Main Server Entry
 *
 * High-Throughput Distributed URL Shortener & Analytics Gateway
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import fs from "fs";
import { redirectRoutes } from "./routes/redirect.js";
import { urlRoutes } from "./routes/urls.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { metricsRoutes } from "./routes/metrics.js";
import { analyticsWorker } from "./analytics/batch-worker.js";
import { db } from "./db/storage-engine.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
  disableRequestLogging: true,
});

async function main() {
  try {
    // 1. Enable Cross-Origin Resource Sharing
    await fastify.register(cors, {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    });

    // 2. Register API & System Routes
    await fastify.register(urlRoutes);
    await fastify.register(analyticsRoutes);
    await fastify.register(metricsRoutes);

    // 3. Register Redirection handler last (wildcard /:code)
    await fastify.register(redirectRoutes);

    // 4. Graceful Shutdown Hooks
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        fastify.log.info(`[FlashRoute] Received ${signal}, initiating graceful shutdown...`);

        // Stop accepting new connections
        await fastify.close();

        // Flush all pending click analytics batches
        analyticsWorker.stop();

        // Take a clean storage checkpoint
        db.checkpoint();

        fastify.log.info("[FlashRoute] Graceful shutdown complete. Exiting.");
        process.exit(0);
      });
    }

    // 5. Start Listening
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n⚡ FlashRoute Engine running on http://localhost:${PORT}`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/api/metrics\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
