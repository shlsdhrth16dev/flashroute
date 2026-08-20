import React from "react";
import { Radio, ExternalLink, Globe, Monitor, Smartphone, Cpu } from "lucide-react";
import { ClickRecord } from "../types";

interface LiveClickStreamProps {
  recentLiveClicks: ClickRecord[];
  onSelectCode: (code: string) => void;
}

export const LiveClickStream: React.FC<LiveClickStreamProps> = ({ recentLiveClicks, onSelectCode }) => {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Real-Time Ingestion Stream (SSE)</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          Lock-Free Async Buffer
        </span>
      </div>

      {recentLiveClicks.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
          Waiting for live clicks... Click any shortened link to see events stream in real-time!
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {recentLiveClicks.map((click) => {
            const timeStr = new Date(click.timestamp).toLocaleTimeString();
            return (
              <div
                key={click.id}
                onClick={() => onSelectCode(click.shortCode)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    {click.device === "MOBILE" ? (
                      <Smartphone className="w-3.5 h-3.5" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-indigo-300 hover:underline">
                        /{click.shortCode}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        {click.country || "Global"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {click.browser} • {click.os} • IP: {click.ipHash.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400">{timeStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
