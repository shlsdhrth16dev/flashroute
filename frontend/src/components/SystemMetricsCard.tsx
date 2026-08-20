import React from "react";
import { Database, ShieldCheck, Zap, Activity, HardDrive, Cpu } from "lucide-react";
import { SystemMetrics } from "../types";

interface SystemMetricsCardProps {
  metrics: SystemMetrics | null;
}

export const SystemMetricsCard: React.FC<SystemMetricsCardProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="glass-panel rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-slate-800/50 rounded-xl"></div>
          <div className="h-16 bg-slate-800/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const { cacheTelemetry, analyticsQueue, databaseStats, processMemory } = metrics;

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Activity className="w-4 h-4" />
          <span>Real-Time Systems Telemetry</span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active Node
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total URLs */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Links</span>
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">{databaseStats.totalUrls}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">WAL Indexed</div>
        </div>

        {/* Total Clicks Ingested */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Clicks</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">{databaseStats.totalClicks}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Async Batch Flush</div>
        </div>

        {/* L1 Cache Hit Ratio */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>L1 Cache Hit %</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{cacheTelemetry.l1.hitRatio}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {cacheTelemetry.l1.hits} hits / {cacheTelemetry.l1.size} keys
          </div>
        </div>

        {/* Thundering Herd Coalesce Rate */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Singleflight %</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {cacheTelemetry.singleflight.stampedeMitigationRate}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {cacheTelemetry.singleflight.coalescedCalls} coalesced calls
          </div>
        </div>
      </div>

      {/* Secondary Telemetry Bars */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400">Process Heap:</span>
          <span className="text-slate-200">{processMemory.heapUsedMB} MB</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400">Batch Queue:</span>
          <span className="text-indigo-300">{analyticsQueue.bufferLength} pending ({analyticsQueue.flushIntervalMs}ms flush)</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400">L2 Store:</span>
          <span className="text-emerald-400">{cacheTelemetry.l2.type.replace(" Simulator", "")}</span>
        </div>
      </div>
    </div>
  );
};
