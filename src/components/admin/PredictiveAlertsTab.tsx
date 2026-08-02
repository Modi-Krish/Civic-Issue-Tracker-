'use client';

import React, { useEffect, useState } from 'react';
import PatternCard from './PatternCard';
import PatternDetailModal from './PatternDetailModal';
import { AlertTriangle, RefreshCw, ShieldAlert, Calendar, CheckCircle2, Bell, AlertOctagon } from 'lucide-react';

export default function PredictiveAlertsTab() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<any | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM_LOW' | 'UPCOMING'>('ALL');
  const [healthStatus, setHealthStatus] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/patterns');
      const data = await res.json();
      if (data.patterns) {
        setPatterns(data.patterns);
        setUnreadCount(data.unreadCount || data.unreadAlertsCount || 0);
      }
    } catch (err) {
      console.error('Error fetching patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const res = await fetch('/api/analytics/run-analysis', { method: 'POST' });
      const result = await res.json();
      if (result.health) setHealthStatus(result.health);
      alert(`Analysis Complete!\n• Patterns Found: ${result.patternsFound || 0}\n• Patterns Updated: ${result.patternsUpdated || 0}\n• Alerts Generated: ${result.alertsGenerated || 0}`);
      fetchPatterns();
    } catch (err: any) {
      alert('Failed to run analysis: ' + err.message);
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleResolvePattern = async (patternId: string) => {
    setActionLoadingId(patternId);
    try {
      const res = await fetch(`/api/analytics/patterns/${patternId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      if (res.ok) {
        setPatterns(prev => prev.filter(p => p.id !== patternId));
      }
    } catch (err: any) {
      alert('Failed to resolve pattern: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (patternId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/analytics/patterns/${patternId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setPatterns(prev => prev.map(p => p.id === patternId ? { ...p, status: newStatus } : p));
        if (selectedPattern) setSelectedPattern((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Filter computations
  const criticalCount = patterns.filter(p => p.severity_level === 'CRITICAL').length;
  const highCount = patterns.filter(p => p.severity_level === 'HIGH').length;
  const upcomingCount = patterns.filter(p => {
    const days = p.predicted_next_at ? (new Date(p.predicted_next_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 999;
    return days <= 14;
  }).length;

  const filteredPatterns = patterns.filter(p => {
    if (filter === 'CRITICAL') return p.severity_level === 'CRITICAL';
    if (filter === 'HIGH') return p.severity_level === 'HIGH';
    if (filter === 'MEDIUM_LOW') return p.severity_level === 'MEDIUM' || p.severity_level === 'LOW';
    if (filter === 'UPCOMING') {
      const days = p.predicted_next_at ? (new Date(p.predicted_next_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 999;
      return days <= 14;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="w-full max-w-full overflow-x-hidden">

      {/* ── SECTION A: STALE DATA WARNING BANNER ── */}
      {healthStatus?.isStale && (
        <div style={{ padding: "14px 18px", borderRadius: 16, background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, color: "#b91c1c" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700 }}>
            <AlertOctagon size={20} className="shrink-0" />
            <span>Alert data may be outdated. Last run: {healthStatus.staleSinceHours ?? 36}h ago.</span>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            style={{ padding: "8px 14px", borderRadius: 10, background: "#dc2626", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer" }}>
            Run Analysis Now
          </button>
        </div>
      )}

      {/* ── SECTION B: SUMMARY STAT CARDS (MOBILE OPTIMIZED GRID) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div style={{ padding: "16px 14px", borderRadius: 18, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }} className="shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }} className="truncate">Critical</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{criticalCount}</div>
          </div>
        </div>

        <div style={{ padding: "16px 14px", borderRadius: 18, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }} className="shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }} className="truncate">High Risk</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ea580c" }}>{highCount}</div>
          </div>
        </div>

        <div style={{ padding: "16px 14px", borderRadius: 18, background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }} className="shrink-0">
            <Calendar size={20} />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }} className="truncate">Urgent (&le;14d)</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0284c7" }}>{upcomingCount}</div>
          </div>
        </div>

        <div style={{ padding: "16px 14px", borderRadius: 18, background: "#f5f3ff", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed" }} className="shrink-0">
            <Bell size={20} />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }} className="truncate">Unread Alerts</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#7c3aed" }}>{unreadCount}</div>
          </div>
        </div>
      </div>

      {/* ── SECTION C: FILTER BAR & CONTROLS (HORIZONTAL SCROLL ON MOBILE) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, width: "100%", maxWidth: "100%", WebkitOverflowScrolling: "touch" }} className="no-scrollbar">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM_LOW', 'UPCOMING'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                border: filter === f ? "none" : "1px solid #e2e8f0",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: filter === f ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "#f8fafc",
                color: filter === f ? "white" : "#475569",
                minHeight: 38
              }}>
              {f === 'ALL' ? 'All Patterns' : f === 'MEDIUM_LOW' ? 'Medium / Low' : f}
            </button>
          ))}
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={runningAnalysis}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
            color: "white",
            fontSize: 13,
            fontWeight: 800,
            border: "none",
            cursor: runningAnalysis ? "default" : "pointer",
            opacity: runningAnalysis ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            minHeight: 44
          }}
          className="sm:w-auto">
          <RefreshCw size={16} className={runningAnalysis ? "animate-spin" : ""} />
          {runningAnalysis ? "Scanning..." : "Refresh Analysis"}
        </button>
      </div>

      {/* ── SECTION D & E: PATTERN CARDS LIST & EMPTY STATE ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b", fontSize: 14, fontWeight: 500 }}>
          Scanning historical infrastructure patterns...
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", borderRadius: 20, border: "1.5px dashed #cbd5e1", background: "#f8fafc" }}>
          <CheckCircle2 size={40} color="#10b981" style={{ marginBottom: 10 }} className="mx-auto" />
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>No Recurring Issues Detected</h3>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>No recurring issues found under this filter. Tap Refresh to re-analyze history.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredPatterns.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onViewDetail={(p) => setSelectedPattern(p)}
              onResolve={handleResolvePattern}
              loadingId={actionLoadingId}
            />
          ))}
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {selectedPattern && (
        <PatternDetailModal
          pattern={selectedPattern}
          onClose={() => setSelectedPattern(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
