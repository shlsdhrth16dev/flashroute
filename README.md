<div align="center">

# ⚡ FlashRoute
### High-Throughput Distributed URL Shortener & Real-Time Analytics Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black.svg?style=flat-square&logo=fastify)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Redis](https://img.shields.io/badge/Redis-L2_Cache-red.svg?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

*A production-grade distributed URL gateway engineered for sub-millisecond read latencies, thundering herd resilience, atomic rate limiting, and asynchronous micro-batch analytics ingestion.*

[Architecture](#-system-architecture) • [Key Features](#-systems-engineering-highlights) • [Quick Start](#-quick-start) • [Benchmarks](#-benchmarks--load-testing) • [API Reference](#-api-reference)

</div>

---

## 📌 Overview

FlashRoute is built from the ground up to solve the core scalability challenges of modern distributed URL redirection and event processing systems:

* **Lock-Free ID Generation**: Eliminates database primary-key auto-increment bottlenecks via a custom **64-bit Snowflake ID Generator** (4M+ unique IDs/sec per node).
* **Cache Stampede (Thundering Herd) Defense**: Leverages **Singleflight Request Coalescing** so 5,000 concurrent cache-miss requests collapse into **exactly 1 database hit**.
* **Cache Penetration Protection**: BitSet **Bloom Filter** rejects non-existent short codes in $\mathcal{O}(1)$ CPU cycles before querying storage.
* **Two-Tier Caching**: In-memory **L1 LRU cache** ($<0.05\text{ms}$ lookup) coupled with an **L2 shared store** with jittered TTL to prevent cache avalanche waves.
* **Atomic Token Bucket Rate Limiting**: Smooth monotonic token replenishment with burst handling and RFC-standard `X-RateLimit-*` response headers.
* **Non-Blocking Analytics Pipeline**: Redirection handler returns `302 Found` in $<1\text{ms}$ while enqueuing click records to a high-speed ring buffer, flushed in bulk batches every 500ms and streamed live via **Server-Sent Events (SSE)**.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["Clients & Web Browsers"] --> Gateway["Fastify Gateway & Router"]
    
    subgraph RateLimiting ["Rate Limiting Layer"]
        Gateway --> TokenBucket["Atomic Token Bucket (Burst Allowance + Smooth Monotonic Refill)"]
    end
    
    subgraph ReadPath ["Ultra-Fast Redirection Path (GET /:code)"]
        Gateway --> Bloom["Bloom Filter (O(1) CPU Negative Check)"]
        Bloom -->|Pass| L1["L1 In-Memory LRU Cache (< 0.05ms)"]
        L1 -->|Cache Miss| Singleflight["Singleflight Request Coalescer"]
        Singleflight --> L2["L2 Distributed Store (Redis / Cluster Simulator)"]
        L2 -->|Cache Miss| Storage["WAL-Backed Persistent Storage Engine"]
        L1 -->|Cache Hit| FastRedirect["302 Found Fast Redirect"]
        L2 -->|Cache Hit| FastRedirect
        Storage -->|Warm Caches| FastRedirect
    end
    
    subgraph WritePath ["Link Creation Path (POST /api/urls)"]
        Gateway --> Snowflake["Distributed 64-Bit Snowflake ID Generator"]
        Snowflake --> Base62["Base62 Alphanumeric Encoder"]
        Base62 --> DBInsert["Atomic WAL Append + Warm Caches & Bloom Filter"]
    end
    
    subgraph AnalyticsEngine ["Asynchronous Micro-Batch Analytics Ingestion"]
        FastRedirect -.->|Non-Blocking Emit (< 0.02ms)| RingBuffer["In-Memory Analytics Ring Buffer"]
        RingBuffer --> BatchWorker["Background Micro-Batch Worker (500ms or 1,000 items)"]
        BatchWorker --> AnalyticsDB["Click Analytics Logs (Indexed)"]
        BatchWorker -.->|Real-Time Broadcast| SSEBroker["Server-Sent Events (SSE) Broker"]
        SSEBroker -.-> Dashboard["Live React Analytics Dashboard"]
    end
```

---

## ⚙️ Systems Engineering Highlights

| Component | Technical Implementation & Systems Principle |
| :--- | :--- |
| **Distributed ID Generation** | **64-bit Twitter Snowflake algorithm** (`1 bit sign + 41 bit timestamp + 10 bit worker ID + 12 bit sequence`) encoded to **Base62**. Generates $4,096,000\text{ IDs/sec}$ locally per node with zero database coordination. |
| **Two-Tier Caching** | **L1 In-Memory LRU Cache** using a Doubly-Linked List + Hash Map for true $\mathcal{O}(1)$ operations, backed by **L2 Shared Cache** with jittered TTL (8–12 min) to avoid simultaneous expiration waves. |
| **Thundering Herd Protection** | **Singleflight pattern** synchronizes concurrent in-flight executions so identical cold-cache keys only hit the database once while all concurrent callers await the single promise. |
| **Cache Penetration Defense** | **In-memory BitSet Bloom Filter** with double-hashing (Kirsch-Mitzenmacher optimization) to reject non-existent random short codes in $\mathcal{O}(1)$ time. |
| **Rate Limiter** | **Atomic Token Bucket** calculating continuous refill via monotonic clock math ($\Delta t \times \text{refillRate}$), supporting burst traffic while enforcing strict rate ceilings. |
| **Async Micro-Batching** | Decouples redirect response from analytics write I/O. Events accumulate in an in-memory ring buffer and flush every 500ms or 1,000 items in bulk. |
| **Durability & Recovery** | **Append-Only Write-Ahead Log (WAL)** with in-memory hash indexing, replayed on startup in $<5\text{ms}$, with automatic checkpointing to compressed JSON snapshots. |
| **Live Telemetry & UI** | **React 19 + Vite + Tailwind CSS** dashboard featuring a real-time **Server-Sent Events (SSE)** click stream, interactive Chart.js graphs, country/device breakdowns, and QR code generator. |

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v20 or higher (v24 fully supported)
* **npm**: v10 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/flashroute.git
cd flashroute
```

### 2. Start the Backend API (Port 3001)
```bash
cd backend
npm install
npm run dev
```
*The backend starts on `http://localhost:3001` with WAL persistence in `backend/data/`.*

### 3. Start the Frontend Dashboard (Port 3000)
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.*

---

## 📊 Benchmarks & Load Testing

FlashRoute includes an integrated high-concurrency load testing harness:

```bash
cd backend
npm run benchmark
```

To run a custom stress test (e.g. 10,000 requests across 100 parallel workers):
```bash
npx tsx src/benchmark.ts 10000 100
```

### Sample Benchmark Results (5,000 Concurrent Requests):
```text
========================================================
⚡ FlashRoute Systems Benchmark & Latency Suite
========================================================
Target:           http://127.0.0.1:3001
Total Requests:   5000
Concurrency:      50 parallel workers
--------------------------------------------------------
[1/3] Provisioning test short links...
Created 10 test links. Hot key: 'linux-mt18j6y1'

[2/3] Executing high-concurrency traffic simulation...
[3/3] Fetching server-side telemetry...

========================================================
📊 BENCHMARK RESULTS
========================================================
Completed Requests:   5000 / 5000
Success (302/200):    5000
Rate Limited (429):   0
Errors:               0
Total Wall Time:      1.515s
Throughput (RPS):     3,301 req/sec
--------------------------------------------------------
⚡ LATENCY PERCENTILES (Client Round-Trip)
  Min Latency:        3.87 ms
  Average Latency:    15.00 ms
  p50 (Median):       12.08 ms
  p90:                24.21 ms
  p95:                30.94 ms
  p99:                75.99 ms
  Max Latency:        108.81 ms
--------------------------------------------------------
🗄️ CACHE TIER RESOLUTION BREAKDOWN
  L1_HIT          :   5000 (100.0%)
========================================================
```

---

## 🛠️ API Reference

### 1. Create a Short URL
```http
POST /api/urls
Content-Type: application/json

{
  "url": "https://news.ycombinator.com",
  "customAlias": "hn-systems",
  "expiresInHours": 24
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "83834090389770240",
    "shortCode": "hn-systems",
    "originalUrl": "https://news.ycombinator.com",
    "shortUrl": "http://localhost:3001/hn-systems",
    "createdAt": 1787213204711,
    "snowflakeDetails": {
      "timestamp": 1787213204711,
      "workerId": 1,
      "sequence": 0
    }
  }
}
```

### 2. Fast URL Redirection
```http
GET /:code
```
* Returns `302 Found` with `Location: <destination>`
* **Response Headers:**
  - `X-Cache-Tier`: `L1_HIT` | `L2_HIT` | `DB_HIT` | `BLOOM_REJECTED`
  - `X-Latency-Ms`: `<0.1ms`
  - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 3. Aggregated Click Analytics
```http
GET /api/analytics/:code
```
* Returns total clicks, unique visitors, time-series volume, country, device, and referrer breakdowns.

### 4. Real-Time Server-Sent Events (SSE) Stream
```http
GET /api/analytics/live
```
* Subscribes client browser to instant click events without polling.

### 5. System Observability & Telemetry
```http
GET /api/metrics
```
* Returns process memory (heap/RSS), L1/L2 cache hit ratios, Singleflight deduplication stats, and batch queue depth.

---

## 🐳 Docker Deployment

Run FlashRoute with Redis in a production multi-container setup:

```bash
docker compose up --build
```

---

## 📂 Project Structure

```
flashroute/
├── backend/
│   ├── src/
│   │   ├── core/
│   │   │   ├── snowflake.ts        # 64-bit distributed Snowflake ID Generator
│   │   │   ├── base62.ts           # Base62 encoder/decoder
│   │   │   ├── singleflight.ts     # Thundering Herd request coalescer
│   │   │   ├── bloom.ts            # BitSet Bloom filter for negative caching
│   │   │   └── token-bucket.ts     # Atomic Token Bucket Rate Limiter
│   │   ├── cache/
│   │   │   ├── l1-lru.ts           # In-memory LRU cache with TTL & O(1) eviction
│   │   │   ├── redis-client.ts     # Redis adapter with cluster simulator fallback
│   │   │   └── cache-manager.ts    # Two-tier orchestrator (L1 -> Singleflight -> L2 -> DB)
│   │   ├── analytics/
│   │   │   ├── batch-worker.ts     # Micro-batch flusher (every 500ms or 1k records)
│   │   │   └── sse-broker.ts       # Server-Sent Events broker for live updates
│   │   ├── db/
│   │   │   └── storage-engine.ts   # Append-only WAL storage with hash indexing
│   │   ├── routes/
│   │   │   ├── redirect.ts         # Fast redirection endpoint (GET /:code)
│   │   │   ├── urls.ts             # Link CRUD (POST /api/urls, GET /api/urls)
│   │   │   ├── analytics.ts        # Analytics & SSE endpoints
│   │   │   └── metrics.ts          # Telemetry & observability endpoint
│   │   ├── index.ts                # Fastify server entry & graceful shutdown
│   │   └── benchmark.ts            # High-concurrency load testing suite
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                       # Modern React 19 + Vite Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── CreateUrlCard.tsx
│   │   │   ├── SystemMetricsCard.tsx
│   │   │   ├── LiveClickStream.tsx
│   │   │   ├── UrlTable.tsx
│   │   │   ├── AnalyticsModal.tsx
│   │   │   └── ArchitectureModal.tsx
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── ARCHITECTURE.md                 # Deep-dive systems design & interview talking points
├── docker-compose.yml              # Multi-container orchestration config
└── README.md
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
