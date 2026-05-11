"use client";

import React, { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";

type Metric = {
  avg: number;
  min: number;
  max: number;
  count: number;
};

type RoutingMetrics = {
  FAST_TRACK: Metric;
  SINGLE_AGENT: Metric;
  MULTI_AGENT: Metric;
};

export default function PerformanceTable() {
  const [metrics, setMetrics] = useState<RoutingMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    let isMounted = true;

    async function fetchMetrics() {
      try {
        const res = await fetch(`${API_URL}/metrics/routing`, { cache: "no-store" });
        const data = await res.json();
        if (isMounted && data.success && data.metrics) {
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error("Architecture telemetry fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMetrics();
    // Set up a background refetch every 30 seconds for extra flair
    const timer = setInterval(fetchMetrics, 30000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const formatRange = (val: Metric | undefined, fallback: string) => {
    if (loading && !metrics) return fallback;
    if (!val || val.count === 0) return fallback;
    return `${val.min.toFixed(2)}s - ${val.max.toFixed(2)}s`;
  };

  const formatAvg = (val: Metric | undefined) => {
    if (!val || val.count === 0) return null;
    return (
      <div className="text-[9px] uppercase opacity-60 tracking-wider font-mono mt-0.5">
        Mean: {val.avg.toFixed(2)}s
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-500">
          <BarChart3 className="w-5 h-5" />
          <h3 className="font-bold text-lg">Routing Performance</h3>
        </div>
        {metrics && (
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse">
            <span className="w-1 h-1 bg-emerald-500 rounded-full" /> Live
          </div>
        )}
      </div>
      <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
              <th className="px-4 py-3 text-left">Pathway</th>
              <th className="px-4 py-3 text-right">Latency / Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-sans">
            <tr>
              <td className="px-4 py-3">
                <div className="font-medium">Direct Fast-Track</div>
                <div className="text-[10px] text-muted-foreground">Cache bypass / Regex</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-green-500">
                <div>{formatRange(metrics?.FAST_TRACK, "0.05s - 0.2s")}</div>
                {formatAvg(metrics?.FAST_TRACK)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <div className="font-medium">Single Agent Call</div>
                <div className="text-[10px] text-muted-foreground">Native Gemini Pipeline</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                <div>{formatRange(metrics?.SINGLE_AGENT, "1.5s - 2.5s")}</div>
                {formatAvg(metrics?.SINGLE_AGENT)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <div className="font-medium">Multi-Agent Chain</div>
                <div className="text-[10px] text-muted-foreground">CrewAI Framework (Configured)</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold opacity-70">
                <div>{formatRange(metrics?.MULTI_AGENT, "3.5s - 5.0s")}</div>
                {formatAvg(metrics?.MULTI_AGENT)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
