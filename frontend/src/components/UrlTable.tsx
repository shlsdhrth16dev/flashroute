import React, { useState } from "react";
import { Copy, Check, BarChart2, Trash2, ExternalLink, Search, Clock } from "lucide-react";
import { UrlRecord } from "../types";

interface UrlTableProps {
  urls: UrlRecord[];
  onSelectAnalytics: (code: string) => void;
  onDeleteUrl: (code: string) => void;
}

export const UrlTable: React.FC<UrlTableProps> = ({ urls, onSelectAnalytics, onDeleteUrl }) => {
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredUrls = urls.filter(
    (u) =>
      u.shortCode.toLowerCase().includes(search.toLowerCase()) ||
      u.originalUrl.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (code: string) => {
    const fullUrl = `http://localhost:3001/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Managed Short Links</h2>
          <p className="text-xs text-slate-400">Indexed & warm-cached in L1/L2 memory hierarchy</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or destination..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>
      </div>

      {filteredUrls.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
          No short links found. Create your first link above to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-3 font-medium">SHORT CODE</th>
                <th className="pb-3 font-medium">ORIGINAL DESTINATION</th>
                <th className="pb-3 font-medium text-center">TOTAL CLICKS</th>
                <th className="pb-3 font-medium">CREATED</th>
                <th className="pb-3 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUrls.map((url) => {
                const isCopied = copiedCode === url.shortCode;
                const createdStr = new Date(url.createdAt).toLocaleDateString();

                return (
                  <tr key={url.shortCode} className="hover:bg-slate-900/50 transition-colors group">
                    {/* Short Code */}
                    <td className="py-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-indigo-400">/{url.shortCode}</span>
                        {url.customAlias && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-sans">
                            vanity
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Original URL */}
                    <td className="py-3 max-w-xs sm:max-w-md truncate text-slate-300">
                      <a
                        href={url.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-indigo-300 hover:underline truncate block"
                        title={url.originalUrl}
                      >
                        {url.originalUrl}
                      </a>
                    </td>

                    {/* Clicks */}
                    <td className="py-3 text-center font-mono">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 font-semibold text-slate-200">
                        {url.clicksCount}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {createdStr}
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Copy */}
                        <button
                          onClick={() => handleCopy(url.shortCode)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                          title="Copy Full Short URL"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Test Redirect in New Tab */}
                        <a
                          href={`http://localhost:3001/${url.shortCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                          title="Test Live Redirect"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Analytics */}
                        <button
                          onClick={() => onSelectAnalytics(url.shortCode)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
                          title="View Aggregated Click Analytics"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Analytics</span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteUrl(url.shortCode)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Short Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
