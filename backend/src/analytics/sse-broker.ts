/**
 * Server-Sent Events (SSE) Live Event Broker
 *
 * Broadcasts real-time click events and system telemetry
 * to connected dashboard clients with zero polling overhead.
 */

import { FastifyReply } from "fastify";
import { ClickRecord } from "../db/storage-engine.js";

class SSEBroker {
  private clients = new Set<FastifyReply>();

  public addClient(reply: FastifyReply) {
    this.clients.add(reply);

    // Initial keep-alive ping
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

    reply.raw.on("close", () => {
      this.clients.delete(reply);
    });
  }

  public broadcastClick(click: ClickRecord) {
    if (this.clients.size === 0) return;

    const payload = `event: click\ndata: ${JSON.stringify(click)}\n\n`;
    for (const client of this.clients) {
      try {
        client.raw.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  public broadcastMetrics(metrics: any) {
    if (this.clients.size === 0) return;

    const payload = `event: metrics\ndata: ${JSON.stringify(metrics)}\n\n`;
    for (const client of this.clients) {
      try {
        client.raw.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const sseBroker = new SSEBroker();
