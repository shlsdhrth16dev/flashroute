/**
 * FlashRoute High-Concurrency Benchmark & Stress-Testing Suite
 *
 * Simulates high-throughput read/write traffic, thundering herd scenarios,
 * and measures p50, p90, p95, and p99 latencies.
 *
 * Usage:
 *   npx tsx src/benchmark.ts [totalRequests] [concurrency]
 */

const TARGET_HOST = process.env.BENCH_HOST || "http://127.0.0.1:3001";
const TOTAL_REQUESTS = Number(process.argv[2]) || 5000;
const CONCURRENCY = Number(process.argv[3]) || 50;

interface BenchmarkResult {
  totalRequests: number;
  successful: number;
  rateLimited: number;
  errors: number;
  totalTimeMs: number;
  rps: number;
  latencies: number[];
  cacheTiers: Record<string, number>;
}

function calculatePercentiles(latencies: number[]) {
  if (latencies.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  latencies.sort((a, b) => a - b);

  const getP = (p: number) => latencies[Math.floor(latencies.length * (p / 100))];
  const sum = latencies.reduce((acc, v) => acc + v, 0);

  return {
    min: latencies[0].toFixed(2),
    max: latencies[latencies.length - 1].toFixed(2),
    avg: (sum / latencies.length).toFixed(2),
    p50: getP(50).toFixed(2),
    p90: getP(90).toFixed(2),
    p95: getP(95).toFixed(2),
    p99: getP(99).toFixed(2),
  };
}

async function createTestUrl(targetUrl: string, alias?: string): Promise<string> {
  const res = await fetch(`${TARGET_HOST}/api/urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: targetUrl, customAlias: alias }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create test URL: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as any;
  return data.data.shortCode;
}

async function runWorker(
  codes: string[],
  requestsCount: number,
  latencies: number[],
  cacheTiers: Record<string, number>,
  counters: { successful: number; rateLimited: number; errors: number }
) {
  for (let i = 0; i < requestsCount; i++) {
    // 80% traffic goes to top 2 hot URLs (Zipfian distribution simulation)
    const isHot = Math.random() < 0.8;
    const code = isHot ? codes[0] : codes[Math.floor(Math.random() * codes.length)];

    const t0 = performance.now();
    try {
      const res = await fetch(`${TARGET_HOST}/${code}`, {
        redirect: "manual", // Do not follow 302 redirect, measure engine response time
        headers: { "X-Benchmark": "true" },
      });

      const elapsed = performance.now() - t0;
      latencies.push(elapsed);

      const cacheTier = res.headers.get("X-Cache-Tier") || "UNKNOWN";
      cacheTiers[cacheTier] = (cacheTiers[cacheTier] || 0) + 1;

      if (res.status === 302 || res.status === 200) {
        counters.successful++;
      } else if (res.status === 429) {
        counters.rateLimited++;
      } else {
        counters.errors++;
      }
    } catch {
      counters.errors++;
    }
  }
}

async function main() {
  console.log(`\n========================================================`);
  console.log(`⚡ FlashRoute Systems Benchmark & Latency Suite`);
  console.log(`========================================================`);
  console.log(`Target:           ${TARGET_HOST}`);
  console.log(`Total Requests:   ${TOTAL_REQUESTS}`);
  console.log(`Concurrency:      ${CONCURRENCY} parallel workers`);
  console.log(`--------------------------------------------------------`);

  // Step 1: Check server availability & Warm up
  try {
    const health = await fetch(`${TARGET_HOST}/api/metrics`);
    if (!health.ok) throw new Error("Server not responding");
  } catch (err: any) {
    console.error(`❌ Error: FlashRoute server is not running on ${TARGET_HOST}.`);
    console.error(`Please start the server with 'npm run dev' first.`);
    process.exit(1);
  }

  console.log(`[1/3] Provisioning test short links...`);
  const suffix = Date.now().toString(36);
  const testCodes: string[] = [];
  testCodes.push(await createTestUrl("https://github.com/torvalds/linux", `linux-${suffix}`));
  testCodes.push(await createTestUrl("https://news.ycombinator.com", `news-${suffix}`));
  for (let i = 0; i < 8; i++) {
    testCodes.push(await createTestUrl(`https://example.com/page-${i}`));
  }
  console.log(`Created ${testCodes.length} test links. Hot key: '${testCodes[0]}'`);

  console.log(`\n[2/3] Executing high-concurrency traffic simulation...`);
  const latencies: number[] = [];
  const cacheTiers: Record<string, number> = {};
  const counters = { successful: 0, rateLimited: 0, errors: 0 };

  const requestsPerWorker = Math.floor(TOTAL_REQUESTS / CONCURRENCY);
  const workers: Promise<void>[] = [];

  const startTime = performance.now();

  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(runWorker(testCodes, requestsPerWorker, latencies, cacheTiers, counters));
  }

  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTime;
  const totalCompleted = latencies.length;
  const rps = (totalCompleted / (totalTimeMs / 1000)).toFixed(0);

  const percentiles = calculatePercentiles(latencies);

  console.log(`\n[3/3] Fetching server-side telemetry...`);
  const metricsRes = await fetch(`${TARGET_HOST}/api/metrics`);
  const metrics = (await metricsRes.json()) as any;

  console.log(`\n========================================================`);
  console.log(`📊 BENCHMARK RESULTS`);
  console.log(`========================================================`);
  console.log(`Completed Requests:   ${totalCompleted} / ${TOTAL_REQUESTS}`);
  console.log(`Success (302/200):    ${counters.successful}`);
  console.log(`Rate Limited (429):   ${counters.rateLimited}`);
  console.log(`Errors:               ${counters.errors}`);
  console.log(`Total Wall Time:      ${(totalTimeMs / 1000).toFixed(3)}s`);
  console.log(`Throughput (RPS):     ${rps} req/sec`);
  console.log(`--------------------------------------------------------`);
  console.log(`⚡ LATENCY PERCENTILES (Client Round-Trip)`);
  console.log(`  Min Latency:        ${percentiles.min} ms`);
  console.log(`  Average Latency:    ${percentiles.avg} ms`);
  console.log(`  p50 (Median):       ${percentiles.p50} ms`);
  console.log(`  p90:                ${percentiles.p90} ms`);
  console.log(`  p95:                ${percentiles.p95} ms`);
  console.log(`  p99:                ${percentiles.p99} ms`);
  console.log(`  Max Latency:        ${percentiles.max} ms`);
  console.log(`--------------------------------------------------------`);
  console.log(`🗄️ CACHE TIER RESOLUTION BREAKDOWN`);
  for (const [tier, count] of Object.entries(cacheTiers)) {
    const pct = ((count / totalCompleted) * 100).toFixed(1);
    console.log(`  ${tier.padEnd(16)}: ${count.toString().padStart(6)} (${pct}%)`);
  }
  console.log(`--------------------------------------------------------`);
  console.log(`🛡️ THUNDERING HERD / SINGLEFLIGHT TELEMETRY`);
  console.log(`  Coalesced Requests: ${metrics.cacheTelemetry.singleflight.coalescedCalls}`);
  console.log(`  Mitigation Rate:    ${metrics.cacheTelemetry.singleflight.stampedeMitigationRate}`);
  console.log(`========================================================\n`);
}

main().catch(console.error);
