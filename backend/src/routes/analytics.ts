/**
 * Analytics & Real-Time Event Routes
 *
 * GET /api/analytics/:code  -> Aggregated statistics for a short URL
 * GET /api/analytics/live   -> Server-Sent Events (SSE) live click stream
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/storage-engine.js";
import { sseBroker } from "../analytics/sse-broker.js";

export async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /api/analytics/:code
  fastify.get("/api/analytics/:code", async (req: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
    const { code } = req.params;
    const summary = db.getAnalytics(code);

    if (!summary) {
      return reply.status(404).send({ error: "No analytics found for code: " + code });
    }

    return reply.send({
      success: true,
      data: summary,
    });
  });

  // GET /api/analytics/live (SSE Stream)
  fastify.get("/api/analytics/live", (req: FastifyRequest, reply: FastifyReply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    sseBroker.addClient(reply);
  });
}
