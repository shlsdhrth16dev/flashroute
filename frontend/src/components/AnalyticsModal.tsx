import React, { useEffect, useState } from "react";
import { X, Globe, Monitor, Compass, Users, Activity, ExternalLink, Calendar } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fetchAnalytics } from "../api";
import { AnalyticsSummary } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface AnalyticsModalProps {
  shortCode: string | null;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ shortCode, onClose }) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shortCode) return;
    setLoading(true);
    setError(null);

    fetchAnalytics(shortCode)
      .then((res) => setData(res))
      .catch((err) => setError(err.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [shortCode]);

  if (!shortCode) return null;

  const chartLabels = data?.clicksOverTime.map((c) => c.date) || [];
  const chartValues = data?.clicksOverTime.map((c) => c.count) || [];

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ["Today"],
    datasets: [
      {
        label: "Clicks",
        data: chartValues.length > 0 ? chartValues : [data?.totalClicks || 0],
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#818cf8",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        borderColor: "#334155",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#64748b", font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#64748b", font: { size: 10 }, precision: 0 },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Analytics Report
              </span>
              <span className="text-lg font-bold font-mono text-white">/{shortCode}</span>
            </div>
            {data && (
              <p className="text-xs text-slate-400 mt-1 max-w-xl truncate">
                Destination: <span className="text-slate-200">{data.originalUrl}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Aggregating analytics data...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-slate-400 text-xs flex items-center justify-between">
                  <span>Total Clicks</span>
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-1">{data.totalClicks}</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-slate-400 text-xs flex items-center justify-between">
                  <span>Unique Visitors</span>
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{data.uniqueVisitors}</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-slate-400 text-xs flex items-center justify-between">
                  <span>Top Country</span>
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-1.5 truncate">
                  {data.countries[0]?.country || "N/A"}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-slate-400 text-xs flex items-center justify-between">
                  <span>Top Referrer</span>
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-1.5 truncate">
                  {data.referrers[0]?.referer || "Direct"}
                </div>
              </div>
            </div>

            {/* Click Volume Chart */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300">Click Ingestion Over Time</h3>
              <div className="h-48 w-full">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Dimensional Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Countries */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Geolocation
                </h4>
                <div className="space-y-1.5">
                  {data.countries.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex justify-between text-slate-400">
                      <span>{c.country}</span>
                      <span className="font-mono text-slate-200 font-medium">{c.count}</span>
                    </div>
                  ))}
                  {data.countries.length === 0 && <span className="text-slate-600">No data</span>}
                </div>
              </div>

              {/* Devices */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" /> Devices
                </h4>
                <div className="space-y-1.5">
                  {data.devices.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex justify-between text-slate-400">
                      <span>{d.device}</span>
                      <span className="font-mono text-slate-200 font-medium">{d.count}</span>
                    </div>
                  ))}
                  {data.devices.length === 0 && <span className="text-slate-600">No data</span>}
                </div>
              </div>

              {/* Referrers */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-400" /> Referrers
                </h4>
                <div className="space-y-1.5">
                  {data.referrers.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex justify-between text-slate-400">
                      <span className="truncate max-w-[140px]">{r.referer}</span>
                      <span className="font-mono text-slate-200 font-medium">{r.count}</span>
                    </div>
                  ))}
                  {data.referrers.length === 0 && <span className="text-slate-600">No data</span>}
                </div>
              </div>
            </div>

            {/* Recent Clicks Log */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300">Recent Click Stream Logs</h3>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="pb-2">TIMESTAMP</th>
                      <th className="pb-2">IP HASH</th>
                      <th className="pb-2">DEVICE</th>
                      <th className="pb-2">BROWSER</th>
                      <th className="pb-2">COUNTRY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-400">
                    {data.recentClicks.map((c) => (
                      <tr key={c.id}>
                        <td className="py-1.5 text-slate-500">
                          {new Date(c.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 text-slate-300">{c.ipHash.slice(0, 8)}...</td>
                        <td className="py-1.5">{c.device || "Desktop"}</td>
                        <td className="py-1.5">{c.browser || "Unknown"}</td>
                        <td className="py-1.5 text-emerald-400">{c.country || "United States"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
