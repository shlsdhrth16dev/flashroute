import React, { useState } from "react";
import { Link2, Sparkles, Copy, Check, QrCode, Cpu, ArrowRight, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createUrl } from "../api";
import { UrlRecord } from "../types";

interface CreateUrlCardProps {
  onUrlCreated: (url: UrlRecord) => void;
}

export const CreateUrlCard: React.FC<CreateUrlCardProps> = ({ onUrlCreated }) => {
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<number | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastCreated, setLastCreated] = useState<{
    record: UrlRecord;
    shortUrl: string;
    snowflakeDetails: any;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await createUrl({
        url: url.trim(),
        customAlias: customAlias.trim() || undefined,
        expiresInHours,
      });

      setLastCreated({
        record: res.data,
        shortUrl: res.data.shortUrl,
        snowflakeDetails: res.data.snowflakeDetails,
      });

      onUrlCreated(res.data);
      setUrl("");
      setCustomAlias("");
    } catch (err: any) {
      setError(err.message || "Failed to create short link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!lastCreated) return;
    navigator.clipboard.writeText(lastCreated.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 glow-indigo relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Distributed Link Generator</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          64-Bit Snowflake + Base62
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Destination Long URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very/long/systems/article"
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Toggle Options */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>{showAdvanced ? "Hide advanced options" : "+ Custom vanity alias & expiration"}</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl animate-in fade-in duration-200">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Custom Vanity Alias (Optional)</label>
              <div className="flex items-center">
                <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-2 rounded-l-lg border-y border-l border-slate-700 font-mono">
                  /
                </span>
                <input
                  type="text"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder="my-custom-link"
                  className="w-full bg-slate-900 border border-slate-700 rounded-r-lg px-3 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Expiration (Optional)
              </label>
              <select
                value={expiresInHours || ""}
                onChange={(e) => setExpiresInHours(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Never Expires (Permanent)</option>
                <option value="1">1 Hour</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="168">7 Days</option>
                <option value="720">30 Days</option>
              </select>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Generate Short Link</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Result Display Box */}
      {lastCreated && (
        <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Generated & Warm Cached
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowQr(!showQr)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Toggle QR Code"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="font-mono text-sm text-indigo-300 break-all select-all font-semibold bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            {lastCreated.shortUrl}
          </div>

          {showQr && (
            <div className="mt-3 p-3 bg-white rounded-xl flex justify-center items-center w-fit mx-auto shadow-xl">
              <QRCodeSVG value={lastCreated.shortUrl} size={130} />
            </div>
          )}

          {/* Snowflake ID Telemetry Breakdown */}
          {lastCreated.snowflakeDetails && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Snowflake 64-bit:</span>
              </div>
              <div className="text-slate-400">
                ID: <span className="text-indigo-300">{lastCreated.record.id}</span> | Worker:{" "}
                <span className="text-emerald-400">{lastCreated.snowflakeDetails.workerId}</span> | Seq:{" "}
                <span className="text-amber-400">{lastCreated.snowflakeDetails.sequence}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
