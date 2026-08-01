'use client';

import React from 'react';
import { AlertTriangle, Calendar, MapPin, CheckCircle2, TrendingUp, TrendingDown, Minus, ArrowRight, Droplet, Wrench, Trash2, Lightbulb, Zap } from 'lucide-react';

interface PatternCardProps {
  pattern: any;
  onViewDetail: (pattern: any) => void;
  onResolve: (patternId: string) => void;
  loadingId?: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'water-leakage': <Droplet size={18} color="#60a5fa" />,
  'water leakage': <Droplet size={18} color="#60a5fa" />,
  'water': <Droplet size={18} color="#60a5fa" />,
  'roads': <Wrench size={18} color="#f59e0b" />,
  'road': <Wrench size={18} color="#f59e0b" />,
  'electricity': <Zap size={18} color="#fbbf24" />,
  'garbage': <Trash2 size={18} color="#34d399" />,
  'sanitation': <Trash2 size={18} color="#34d399" />,
  'streetlights': <Lightbulb size={18} color="#FF2E11" />,
  'default': <AlertTriangle size={18} color="#a78bfa" />
};

export default function PatternCard({ pattern, onViewDetail, onResolve, loadingId }: PatternCardProps) {
  const catKey = (pattern.category_id || '').toLowerCase();
  const Icon = CATEGORY_ICONS[catKey] || CATEGORY_ICONS.default;

  const isCritical = pattern.severity_level === 'CRITICAL' || pattern.severity_level === 'HIGH';
  const daysUntilNext = pattern.predicted_next_at
    ? Math.round((new Date(pattern.predicted_next_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const isUrgentNext = daysUntilNext <= 14;

  const severityColor =
    pattern.severity_level === 'CRITICAL' ? '#ef4444' :
    pattern.severity_level === 'HIGH' ? '#f97316' :
    pattern.severity_level === 'MEDIUM' ? '#f59e0b' : '#9ca3af';

  const severityBg =
    pattern.severity_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' :
    pattern.severity_level === 'HIGH' ? 'rgba(249, 115, 22, 0.15)' :
    pattern.severity_level === 'MEDIUM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(156, 163, 175, 0.15)';

  // XAI Breakdown factors
  const breakdown = pattern.score_breakdown || {
    occurrenceCount: Math.round(pattern.risk_score * 0.35),
    frequency: Math.round(pattern.risk_score * 0.35),
    trendBonus: Math.round(pattern.risk_score * 0.2),
    categoryWeight: Math.round(pattern.risk_score * 0.1),
    total: pattern.risk_score || 0
  };

  const totalScore = pattern.risk_score || 1;
  const pCount = Math.max(0, Math.min(100, (breakdown.occurrenceCount / Math.max(1, totalScore)) * 100));
  const pFreq = Math.max(0, Math.min(100, (breakdown.frequency / Math.max(1, totalScore)) * 100));
  const pTrend = Math.max(0, Math.min(100, (breakdown.trendBonus / Math.max(1, totalScore)) * 100));
  const pCat = Math.max(0, Math.min(100, (breakdown.categoryWeight / Math.max(1, totalScore)) * 100));

  return (
    <div
      style={{
        borderRadius: 20,
        background: "rgba(255,255,255,0.02)",
        border: `1.5px solid ${isCritical ? severityColor + '40' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: isCritical ? `0 8px 32px ${severityColor}10` : 'none',
      }}
      className="p-4 sm:p-6 flex flex-col gap-4 w-full max-w-full overflow-hidden">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `${severityColor}15`,
              border: `1px solid ${severityColor}30`,
            }}
            className="flex items-center justify-center shrink-0 mt-0.5">
            {Icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white capitalize truncate">
                {pattern.category_id} Infrastructure Pattern
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: severityBg,
                  color: severityColor,
                  border: `1px solid ${severityColor}35`,
                  letterSpacing: "0.05em"
                }}>
                {pattern.severity_level}
              </span>
            </div>

            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} className="flex items-center gap-1.5 truncate">
              <MapPin size={13} color="#0ea5e9" className="shrink-0" />
              <span className="truncate">
                {pattern.location_description || `Centroid (${pattern.cluster_lat?.toFixed(4)}, ${pattern.cluster_lng?.toFixed(4)})`}
              </span>
            </p>
          </div>
        </div>

        {/* Risk Score Pill */}
        <div className="self-end sm:self-auto bg-black/30 px-3.5 py-2 rounded-xl border border-white/10 shrink-0">
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Risk Score</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: pattern.risk_score >= 70 ? "#ef4444" : pattern.risk_score >= 40 ? "#fbbf24" : "#10b981" }}>
            {pattern.risk_score} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-black/20 border border-white/5">
        <div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Occurrences</span>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginTop: 2 }}>{pattern.occurrence_count} Incidents</div>
        </div>

        <div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Interval</span>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginTop: 2 }}>~{pattern.median_interval_days} days</div>
        </div>

        <div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Trend</span>
          <div style={{ fontSize: 12, fontWeight: 800, color: pattern.trend === 'INCREASING' ? "#ef4444" : pattern.trend === 'DECREASING' ? "#10b981" : "#fbbf24" }} className="flex items-center gap-1 mt-0.5">
            {pattern.trend === 'INCREASING' ? <TrendingUp size={14} /> : pattern.trend === 'DECREASING' ? <TrendingDown size={14} /> : <Minus size={14} />}
            {pattern.trend === 'INCREASING' ? '↑ Accelerating' : pattern.trend === 'DECREASING' ? '↓ Slowing' : '→ Stable'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Confidence</span>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0ea5e9", marginTop: 2 }}>{pattern.prediction_confidence}% Wilson</div>
        </div>
      </div>

      {/* XAI Risk Score Breakdown Bar */}
      <div className="p-3 rounded-xl bg-black/25 border border-white/5 flex flex-col gap-2">
        <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Explainable AI (XAI) Breakdown
        </div>

        <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${pCount}%`, background: "#3b82f6" }} title={`Occurrences: ${breakdown.occurrenceCount}`} />
          <div style={{ width: `${pFreq}%`, background: "#f59e0b" }} title={`Frequency: ${breakdown.frequency}`} />
          <div style={{ width: `${pTrend}%`, background: "#ef4444" }} title={`Trend: ${breakdown.trendBonus}`} />
          <div style={{ width: `${pCat}%`, background: "#8b5cf6" }} title={`Category: ${breakdown.categoryWeight}`} />
        </div>

        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
          Score {pattern.risk_score} = Count({breakdown.occurrenceCount}) + Freq({breakdown.frequency}) + Trend({breakdown.trendBonus}) + Cat({breakdown.categoryWeight})
        </div>
      </div>

      {/* Next Prediction */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div style={{ color: isUrgentNext ? "#ef4444" : "rgba(255,255,255,0.7)", fontWeight: 700 }} className="flex items-center gap-1.5">
          <Calendar size={14} color={isUrgentNext ? "#ef4444" : "#0ea5e9"} />
          Predicted: <span className={isUrgentNext ? "underline" : ""}>
            {daysUntilNext > 0 ? `In ${daysUntilNext} days` : 'Overdue'} ({new Date(pattern.predicted_next_at).toLocaleDateString()})
          </span>
        </div>

        {pattern.seasonal_decomposition_applied && (
          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6, background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa" }}>
            Seasonal Index: {pattern.seasonal_index}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2.5 pt-2 border-t border-dashed border-white/10">
        <button
          onClick={() => onViewDetail(pattern)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "white",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            minHeight: 44
          }}
          className="flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          View History <ArrowRight size={14} />
        </button>

        <button
          onClick={() => onResolve(pattern.id)}
          disabled={loadingId === pattern.id}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            minHeight: 44
          }}
          className="flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <CheckCircle2 size={14} /> Mark Resolved
        </button>
      </div>
    </div>
  );
}
