'use client';

import React, { useEffect, useState } from 'react';
import PatternCard from './PatternCard';
import PatternDetailModal from './PatternDetailModal';
import { AlertTriangle, RefreshCw, ShieldAlert, Calendar, CheckCircle2, Bell, AlertOctagon } from 'lucide-react';

// ── Design tokens (shared with AdminDashboardUI) ──
const T = {
  base:       '#EDEBE4',
  raised:     '#F5F3EC',
  border:     '#DDD9CE',
  text1:      '#2C2C2A',
  text2:      '#5F5E5A',
  text3:      '#888780',
  accent:     '#1D9E75',
  accentDark: '#167A5B',
  accentTint: '#E1F5EE',
  shL: 'rgba(255,255,255,0.75)',
  shD: 'rgba(0,0,0,0.09)',
} as const;

const SH = {
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, -3px -3px 7px ${T.shL}`,
};

// Severity color mapping for stat cards (warm palette)
const SEVERITY_STAT = {
  critical: { bg: '#FCEBEB', iconBg: '#FCEBEB', color: '#791F1F', border: '#E8C4C4' },
  high:     { bg: '#FAEEDA', iconBg: '#FAEEDA', color: '#854F0B', border: '#E8D5B0' },
  upcoming: { bg: '#E6F1FB', iconBg: '#E6F1FB', color: '#0C447C', border: '#C1D8EC' },
  unread:   { bg: '#EEEDFE', iconBg: '#EEEDFE', color: '#3C3489', border: '#D0CEED' },
};

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="w-full max-w-full overflow-x-hidden font-sans">

      {/* ── SECTION A: STALE DATA WARNING BANNER ── */}
      {healthStatus?.isStale && (
        <div style={{ padding: "14px 18px", borderRadius: 20, background: '#FCEBEB', border: '1.5px solid #E8C4C4', display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, color: '#791F1F', boxShadow: SH.raisedSm }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700 }} className="leading-tight">
            <AlertOctagon size={20} className="shrink-0" />
            <span>Alert data may be outdated. Last run: {healthStatus.staleSinceHours ?? 36}h ago.</span>
          </div>
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            style={{ padding: "8px 14px", borderRadius: 12, background: '#791F1F', color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: SH.raisedSm }}
            className="flex items-center gap-1.5 shrink-0">
            <span>Run Analysis Now</span>
          </button>
        </div>
      )}

      {/* ── SECTION B: SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Critical */}
        <div style={{ padding: "16px 14px", borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: SEVERITY_STAT.critical.bg, display: "flex", alignItems: "center", justifyContent: "center", color: SEVERITY_STAT.critical.color, boxShadow: SH.insetSoft }} className="shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="min-w-0 leading-tight">
            <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }} className="truncate">Critical</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: SEVERITY_STAT.critical.color, marginTop: 2, letterSpacing: '-0.04em' }}>{criticalCount}</div>
          </div>
        </div>

        {/* High Risk */}
        <div style={{ padding: "16px 14px", borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: SEVERITY_STAT.high.bg, display: "flex", alignItems: "center", justifyContent: "center", color: SEVERITY_STAT.high.color, boxShadow: SH.insetSoft }} className="shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 leading-tight">
            <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }} className="truncate">High Risk</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: SEVERITY_STAT.high.color, marginTop: 2, letterSpacing: '-0.04em' }}>{highCount}</div>
          </div>
        </div>

        {/* Urgent ≤14d */}
        <div style={{ padding: "16px 14px", borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: SEVERITY_STAT.upcoming.bg, display: "flex", alignItems: "center", justifyContent: "center", color: SEVERITY_STAT.upcoming.color, boxShadow: SH.insetSoft }} className="shrink-0">
            <Calendar size={20} />
          </div>
          <div className="min-w-0 leading-tight">
            <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }} className="truncate">Urgent (≤14d)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: SEVERITY_STAT.upcoming.color, marginTop: 2, letterSpacing: '-0.04em' }}>{upcomingCount}</div>
          </div>
        </div>

        {/* Unread Alerts */}
        <div style={{ padding: "16px 14px", borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: SEVERITY_STAT.unread.bg, display: "flex", alignItems: "center", justifyContent: "center", color: SEVERITY_STAT.unread.color, boxShadow: SH.insetSoft }} className="shrink-0">
            <Bell size={20} />
          </div>
          <div className="min-w-0 leading-tight">
            <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }} className="truncate">Unread Alerts</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: SEVERITY_STAT.unread.color, marginTop: 2, letterSpacing: '-0.04em' }}>{unreadCount}</div>
          </div>
        </div>
      </div>

      {/* ── SECTION C: FILTER BAR & CONTROLS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, width: "100%", maxWidth: "100%", WebkitOverflowScrolling: "touch" }} className="no-scrollbar">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM_LOW', 'UPCOMING'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 800,
                border: filter === f ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: filter === f ? T.accentTint : T.raised,
                color: filter === f ? T.accentDark : T.text2,
                boxShadow: filter === f ? SH.insetSoft : SH.raisedSm,
                minHeight: 38,
                letterSpacing: '0.04em',
              }}>
              {f === 'ALL' ? 'All Patterns' : f === 'MEDIUM_LOW' ? 'Medium / Low' : f}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={runningAnalysis}
          style={{
            padding: "10px 16px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
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
            minHeight: 44,
            boxShadow: SH.raisedSm,
          }}
          className="sm:w-auto">
          <RefreshCw size={16} className={runningAnalysis ? "animate-spin" : ""} />
          <span>{runningAnalysis ? "Scanning..." : "Refresh Analysis"}</span>
        </button>
      </div>

      {/* ── SECTION D & E: PATTERN CARDS LIST & EMPTY STATE ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.text3, fontSize: 14, fontWeight: 500 }}>
          Scanning historical infrastructure patterns...
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", borderRadius: 24, border: `1.5px dashed ${T.border}`, background: T.raised, boxShadow: SH.insetSoft }}>
          <CheckCircle2 size={40} color={T.accent} style={{ marginBottom: 10 }} className="mx-auto" />
          <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text1, margin: "0 0 6px" }}>No Recurring Issues Detected</h3>
          <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>No recurring issues found under this filter. Tap Refresh to re-analyze history.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredPatterns.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onViewDetail={(p: any) => setSelectedPattern(p)}
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
