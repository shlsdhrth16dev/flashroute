/**
 * URL Management Routes (Create, List, Delete)
 *
 * POST   /api/urls
 * GET    /api/urls
 * DELETE /api/urls/:code
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { defaultSnowflake } from "../core/snowflake.js";
import { encodeBase62, isValidAlias } from "../core/base62.js";
import { cacheManager } from "../cache/cache-manager.js";
import { globalWriteLimiter } from "../core/token-bucket.js";
import { db, UrlRecord } from "../db/storage-engine.js";

interface CreateUrlBody {
  url: string;
  customAlias?: string;
  expiresInHours?: number;
}

export async function urlRoutes(fastify: FastifyInstance) {
  // POST /api/urls -> Shorten a new URL
  fastify.post("/api/urls", async (req: FastifyRequest<{ Body: CreateUrlBody }>, reply: FastifyReply) => {
    const clientIp = req.ip || "127.0.0.1";

    // 1. Rate Limiting Check for write operations
    const rateLimit = await globalWriteLimiter.consume(clientIp, 1);
    reply.header("X-RateLimit-Limit", rateLimit.limit);
    reply.header("X-RateLimit-Remaining", rateLimit.remaining);
    reply.header("X-RateLimit-Reset", rateLimit.resetTimeMs);

    if (!rateLimit.allowed) {
      reply.header("Retry-After", rateLimit.retryAfterSec || 1);
      return reply.status(429).send({
        error: "Too Many Requests",
        message: "URL generation rate limit reached. Please slow down.",
        retryAfterSec: rateLimit.retryAfterSec,
      });
    }

    const { url, customAlias, expiresInHours } = req.body || {};

    if (!url || typeof url !== "string") {
      return reply.status(400).send({ error: "Missing or invalid 'url' parameter in request body" });
    }

    // Basic URL validation
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (validUrl.protocol !== "http:" && validUrl.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      return reply.status(400).send({ error: "Invalid URL. Must begin with http:// or https://" });
    }

    let shortCode: string;
    let snowflakeId: bigint;

    if (customAlias && customAlias.trim()) {
      const alias = customAlias.trim();
      if (!isValidAlias(alias)) {
        return reply.status(400).send({
          error: "Custom alias must be between 3 and 32 alphanumeric characters (or '-' / '_')",
        });
      }
      if (db.exists(alias)) {
        return reply.status(409).send({
          error: "Conflict",
          message: `Custom alias '${alias}' is already in use. Please choose another.`,
        });
      }
      shortCode = alias;
      snowflakeId = defaultSnowflake.nextId();
    } else {
      // Generate 64-bit Snowflake ID and convert to Base62
      snowflakeId = defaultSnowflake.nextId();
      shortCode = encodeBase62(snowflakeId);
    }

    const now = Date.now();
    const expiresAt = expiresInHours && expiresInHours > 0
      ? now + expiresInHours * 60 * 60 * 1000
      : undefined;

    const record: UrlRecord = {
      id: snowflakeId.toString(),
      shortCode,
      originalUrl: validUrl.toString(),
      customAlias: customAlias ? customAlias.trim() : undefined,
      createdAt: now,
      expiresAt,
      clicksCount: 0,
    };

    // Store in WAL-backed storage engine
    db.insertUrl(record);

    // Warm multi-tier cache & bloom filter immediately
    await cacheManager.setShortUrl(shortCode, record.originalUrl);

    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || "localhost:3000";
    const fullShortUrl = `${protocol}://${host}/${shortCode}`;

    return reply.status(201).send({
      success: true,
      data: {
        ...record,
        shortUrl: fullShortUrl,
        snowflakeDetails: defaultSnowflake.decompose(snowflakeId),
      },
    });
  });

  // GET /api/urls -> List recent short URLs
  fastify.get("/api/urls", async (_req: FastifyRequest, reply: FastifyReply) => {
    const urls = db.getAllUrls(50);
    return reply.send({
      success: true,
      count: urls.length,
      urls,
    });
  });

  // DELETE /api/urls/:code -> Delete a short URL
  fastify.delete("/api/urls/:code", async (req: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
    const { code } = req.params;
    const deleted = db.deleteUrl(code);

    if (!deleted) {
      return reply.status(404).send({ error: "Short URL not found" });
    }

    await cacheManager.invalidate(code);
    return reply.send({ success: true, message: `Short URL '${code}' deleted successfully` });
  });
}
