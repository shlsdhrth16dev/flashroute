import React, { useState } from "react";
import { X, Layers, Cpu, ShieldCheck, Zap, Database, Clock } from "lucide-react";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"id" | "cache" | "singleflight" | "rate" | "analytics">("id");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Systems Architecture & Design Decisions</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Production-grade architectural patterns implemented in FlashRoute for maximum throughput and scale.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("id")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "id"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>1. 64-bit Snowflake ID</span>
          </button>

          <button
            onClick={() => setActiveTab("cache")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "cache"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2. Two-Tier Caching</span>
          </button>

          <button
            onClick={() => setActiveTab("singleflight")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "singleflight"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Singleflight Stampede Defense</span>
          </button>

          <button
            onClick={() => setActiveTab("rate")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "rate"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>4. Atomic Token Bucket</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "analytics"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>5. Async Batch Ingestion</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-300 space-y-4">
          {activeTab === "id" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-indigo-300">
                Distributed 64-Bit Snowflake ID Generator & Base62 Encoding
              </h3>
              <p>
                Instead of using centralized auto-increment database locks or random UUID strings (which are 36
                characters and cause B-Tree index fragmentation), FlashRoute generates 64-bit time-ordered integers
                locally on each worker node.
              </p>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300">
                <span className="text-slate-500">1 bit (Sign)</span> |{" "}
                <span className="text-indigo-400">41 bits Timestamp (~69 yrs)</span> |{" "}
                <span className="text-emerald-400">10 bits Worker ID (1024 nodes)</span> |{" "}
                <span className="text-amber-400">12 bits Sequence (4096 IDs/ms)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Throughput:</strong> 4,096,000 unique IDs per second per node without database queries.</li>
                <li><strong className="text-slate-200">URL-Safe Base62:</strong> Compact 7-character short codes (e.g. <code>k8F29aX</code>).</li>
                <li><strong className="text-slate-200">Time-Ordered:</strong> Naturally sequential, ensuring append-only B-Tree index insertions.</li>
              </ul>
            </div>
          )}

          {activeTab === "cache" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-300">
                Two-Tier Hierarchical Caching (L1 In-Memory + L2 Shared)
              </h3>
              <p>
                FlashRoute employs an L1 in-process LRU cache combined with an L2 shared cache and Bloom filter
                to achieve ultra-low redirection latencies under massive concurrent traffic.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-indigo-400 font-bold mb-1">Bloom Filter</div>
                  <div className="text-slate-400">Rejects non-existent keys in O(1) CPU cycles to prevent cache penetration.</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-emerald-400 font-bold mb-1">L1 LRU Cache</div>
                  <div className="text-slate-400">Serves hot URLs in &lt; 0.05ms directly from memory.</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-amber-400 font-bold mb-1">L2 Shared Cache</div>
                  <div className="text-slate-400">Distributed Redis store with jittered TTL to prevent cache expiration waves.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "singleflight" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-cyan-300">
                Singleflight Request Coalescing (Thundering Herd / Cache Stampede Defense)
              </h3>
              <p>
                When a popular short link's cache expires or a cold link experiences a sudden traffic spike of 5,000
                concurrent requests, traditional systems launch 5,000 duplicate queries, causing database brownouts.
              </p>
              <p>
                FlashRoute's <code>SingleflightGroup</code> ensures only <strong>1 database query</strong> is in-flight
                per short code. The other 4,999 requests subscribe to the active Promise and receive the result simultaneously.
              </p>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-cyan-300">
                10,000 Concurrent Requests ➔ Singleflight Coalescer ➔ Exactly 1 DB Fetch ➔ All 10k resolved!
              </div>
            </div>
          )}

          {activeTab === "rate" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-300">
                Atomic Token Bucket Rate Limiter
              </h3>
              <p>
                Unlike naive fixed-window counters that allow 2x traffic bursts at window boundaries, FlashRoute uses a
                Token Bucket algorithm:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Burst Allowance:</strong> Accommodates bursty legitimate user traffic without artificial drops.</li>
                <li><strong className="text-slate-200">Smooth Continuous Refill:</strong> Replenishes tokens incrementally based on elapsed monotonic milliseconds.</li>
                <li><strong className="text-slate-200">RFC Compliant Headers:</strong> Returns <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>, and <code>Retry-After</code>.</li>
              </ul>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-purple-300">
                Asynchronous Micro-Batch Analytics Ingestion & Server-Sent Events
              </h3>
              <p>
                Logging click analytics (IP hashing, user-agent parsing, device detection, country mapping) must never
                delay the 302 HTTP redirection response.
              </p>
              <p>
                FlashRoute pushes click events onto an in-memory ring buffer in <strong>&lt; 0.02ms</strong>. A background worker
                flushes micro-batches every 500ms or 1,000 items to persistent storage and streams live events to the UI via SSE.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
