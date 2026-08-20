import React, { useEffect, useState, useCallback } from "react";
import { Header } from "./components/Header";
import { CreateUrlCard } from "./components/CreateUrlCard";
import { SystemMetricsCard } from "./components/SystemMetricsCard";
import { LiveClickStream } from "./components/LiveClickStream";
import { UrlTable } from "./components/UrlTable";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { ArchitectureModal } from "./components/ArchitectureModal";
import { fetchUrls, fetchMetrics, deleteUrl } from "./api";
import { UrlRecord, ClickRecord, SystemMetrics } from "./types";

export const App: React.FC = () => {
  const [urls, setUrls] = useState<UrlRecord[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentLiveClicks, setRecentLiveClicks] = useState<ClickRecord[]>([]);
  const [selectedAnalyticsCode, setSelectedAnalyticsCode] = useState<string | null>(null);
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fetchedUrls, fetchedMetrics] = await Promise.all([
        fetchUrls(),
        fetchMetrics(),
      ]);
      setUrls(fetchedUrls);
      setMetrics(fetchedMetrics);
    } catch (err) {
      console.warn("Error fetching initial dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Poll metrics every 3 seconds
    const interval = setInterval(async () => {
      try {
        const m = await fetchMetrics();
        setMetrics(m);
      } catch {}
    }, 3000);

    // Subscribe to Server-Sent Events (SSE) live click stream
    const eventSource = new EventSource("http://localhost:3001/api/analytics/live");

    eventSource.addEventListener("click", (e) => {
      try {
        const click: ClickRecord = JSON.parse(e.data);
        setRecentLiveClicks((prev) => [click, ...prev].slice(0, 30));

        // Increment click counter locally in the URL table
        setUrls((prev) =>
          prev.map((u) =>
            u.shortCode === click.shortCode
              ? { ...u, clicksCount: u.clicksCount + 1 }
              : u
          )
        );
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, [loadData]);

  const handleUrlCreated = (newUrl: UrlRecord) => {
    setUrls((prev) => [newUrl, ...prev]);
    fetchMetrics().then(setMetrics).catch(() => {});
  };

  const handleDeleteUrl = async (code: string) => {
    try {
      await deleteUrl(code);
      setUrls((prev) => prev.filter((u) => u.shortCode !== code));
      fetchMetrics().then(setMetrics).catch(() => {});
    } catch (err: any) {
      alert(err.message || "Failed to delete short URL");
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      <Header
        metrics={metrics}
        onOpenArchitecture={() => setShowArchitectureModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Section: Link Creator + Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CreateUrlCard onUrlCreated={handleUrlCreated} />
          <SystemMetricsCard metrics={metrics} />
        </div>

        {/* Live SSE Click Ingestion Ticker */}
        <LiveClickStream
          recentLiveClicks={recentLiveClicks}
          onSelectCode={(code) => setSelectedAnalyticsCode(code)}
        />

        {/* Managed URLs Table */}
        <UrlTable
          urls={urls}
          onSelectAnalytics={(code) => setSelectedAnalyticsCode(code)}
          onDeleteUrl={handleDeleteUrl}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/40 py-6 text-center text-xs text-slate-500 font-mono">
        FlashRoute Engine • Distributed Snowflake IDs • Multi-Tier Caching • Thundering Herd Defense
      </footer>

      {/* Modals */}
      <AnalyticsModal
        shortCode={selectedAnalyticsCode}
        onClose={() => setSelectedAnalyticsCode(null)}
      />

      <ArchitectureModal
        isOpen={showArchitectureModal}
        onClose={() => setShowArchitectureModal(false)}
      />
    </div>
  );
};
