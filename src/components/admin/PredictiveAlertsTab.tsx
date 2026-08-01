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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* ── SECTION A: STALE DATA WARNING BANNER ── */}
      {healthStatus?.isStale && (
        <div style={{ padding: "14px 20px", borderRadius: 16, background: "rgba(239, 68, 68, 0.15)", border: "1.5px solid rgba(239, 68, 68, 0.4)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f87171" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700 }}>
            <AlertOctagon size={20} />
            ⚠️ Alert data may be outdated. Last successful analysis: {healthStatus.staleSinceHours ?? 36} hours ago.
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            style={{ padding: "8px 14px", borderRadius: 10, background: "#ef4444", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer" }}>
            Run Analysis Now
          </button>
        </div>
      )}

      {/* ── SECTION B: SUMMARY STAT CARDS (ROW OF 4) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 20, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Critical Patterns</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#ef4444" }}>{criticalCount}</div>
          </div>
        </div>

        <div style={{ padding: 20, borderRadius: 20, background: "rgba(249, 115, 22, 0.08)", border: "1px solid rgba(249, 115, 22, 0.2)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(249, 115, 22, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>High Risk</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#f97316" }}>{highCount}</div>
          </div>
        </div>

        <div style={{ padding: 20, borderRadius: 20, background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14, 165, 233, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9" }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Urgent (&le;14 Days)</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#0ea5e9" }}>{upcomingCount}</div>
          </div>
        </div>

        <div style={{ padding: 20, borderRadius: 20, background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa" }}>
            <Bell size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Unread Alerts</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#a78bfa" }}>{unreadCount}</div>
          </div>
        </div>
      </div>

      {/* ── SECTION C: FILTER BAR & CONTROLS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM_LOW', 'UPCOMING'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                background: filter === f ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.04)",
                color: filter === f ? "white" : "rgba(255,255,255,0.6)"
              }}>
              {f === 'ALL' ? 'All Patterns' : f === 'MEDIUM_LOW' ? 'Medium / Low' : f}
            </button>
          ))}
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={runningAnalysis}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
            color: "white",
            fontSize: 13,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8
          }}>
          <RefreshCw size={16} className={runningAnalysis ? "animate-spin" : ""} />
          {runningAnalysis ? "Scanning..." : "Refresh Analysis"}
        </button>
      </div>

      {/* ── SECTION D & E: PATTERN CARDS LIST & EMPTY STATE ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Scanning historical infrastructure patterns...
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 12, opacity: 0.8 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", margin: "0 0 6px" }}>No Recurring Issues Detected</h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>No recurring issues detected. Run analysis to scan complaint history.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
