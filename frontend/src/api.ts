import { UrlRecord, AnalyticsSummary, SystemMetrics } from "./types";

const API_BASE = "http://localhost:3001";

export async function fetchUrls(): Promise<UrlRecord[]> {
  const res = await fetch(`${API_BASE}/api/urls`);
  if (!res.ok) throw new Error("Failed to fetch URLs");
  const data = await res.json();
  return data.urls || [];
}

export async function createUrl(payload: {
  url: string;
  customAlias?: string;
  expiresInHours?: number;
}): Promise<{ data: UrlRecord & { shortUrl: string; snowflakeDetails: any } }> {
  const res = await fetch(`${API_BASE}/api/urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || "Failed to create short link");
  }
  return json;
}

export async function deleteUrl(code: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/urls/${code}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed to delete URL");
  }
}

export async function fetchAnalytics(code: string): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/api/analytics/${code}`);
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed to fetch analytics");
  }
  const json = await res.json();
  return json.data;
}

export async function fetchMetrics(): Promise<SystemMetrics> {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) throw new Error("Failed to fetch system metrics");
  return res.json();
}
