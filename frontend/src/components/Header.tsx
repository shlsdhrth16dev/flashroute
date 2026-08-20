import React from "react";
import { Zap, Activity, BookOpen, Layers, Radio } from "lucide-react";
import { SystemMetrics } from "../types";

interface HeaderProps {
  metrics: SystemMetrics | null;
  onOpenArchitecture: () => void;
}

export const Header: React.FC<HeaderProps> = ({ metrics, onOpenArchitecture }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">FlashRoute</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Distributed v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">High-Throughput URL Gateway & Real-Time Analytics</p>
          </div>
        </div>

        {/* Right: Live Telemetry & Architecture Button */}
        <div className="flex items-center gap-4">
          {metrics && (
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-200">Uptime: {metrics.uptimeSeconds}s</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Radio className="w-3.5 h-3.5" />
                <span>Live SSE Stream</span>
              </div>
            </div>
          )}

          <button
            onClick={onOpenArchitecture}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Systems Architecture</span>
          </button>
        </div>
      </div>
    </header>
  );
};
