'use client';

import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Clock,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface PatternCardProps {
  pattern: any;
  onViewDetail: (pattern: any) => void;
  onResolve: (patternId: string) => void;
  loadingId: string | null;
}

const severityConfig: Record<string, { bg: string; border: string; badge: string; badgeText: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: {
    bg: '#fef2f2',
    border: '#fecaca',
    badge: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    badgeText: '#fff',
    icon: <ShieldAlert size={14} />,
    label: 'Critical',
  },
  HIGH: {
    bg: '#fff7ed',
    border: '#fed7aa',
    badge: 'linear-gradient(135deg, #ea580c, #c2410c)',
    badgeText: '#fff',
    icon: <AlertTriangle size={14} />,
    label: 'High',
  },
  MEDIUM: {
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'linear-gradient(135deg, #d97706, #b45309)',
    badgeText: '#fff',
    icon: <AlertTriangle size={14} />,
    label: 'Medium',
  },
  LOW: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'linear-gradient(135deg, #16a34a, #15803d)',
    badgeText: '#fff',
    icon: <Info size={14} />,
    label: 'Low',
  },
};

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PatternCard({ pattern, onViewDetail, onResolve, loadingId }: PatternCardProps) {
  const severity = severityConfig[pattern.severity_level] || severityConfig.LOW;
  const daysUntil = getDaysUntil(pattern.predicted_next_at);
  const isUrgent = daysUntil !== null && daysUntil <= 7;
  const isLoading = loadingId === pattern.id;

  return (
    <div
      style={{
        borderRadius: 18,
        border: `1.5px solid ${severity.border}`,
        background: '#ffffff',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'pointer',
      }}
      className="hover:shadow-lg hover:-translate-y-0.5"
      onClick={() => onViewDetail(pattern)}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: severity.badge }} />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
            {/* Severity badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: severity.badge,
                  color: severity.badgeText,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                {severity.icon}
                {severity.label}
              </span>

              {isUrgent && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 700,
                    animation: 'pulse 2s infinite',
                  }}
                >
                  <Clock size={12} />
                  {daysUntil! <= 0 ? 'Overdue' : `${daysUntil}d left`}
                </span>
              )}

              {pattern.status && pattern.status !== 'ACTIVE' && (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: pattern.status === 'MONITORING' ? '#dbeafe' : '#f1f5f9',
                    color: pattern.status === 'MONITORING' ? '#1d4ed8' : '#475569',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {pattern.status}
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                lineHeight: 1.35,
              }}
              className="line-clamp-2"
            >
              {pattern.pattern_type?.replace(/_/g, ' ') || 'Unknown Pattern'}
              {pattern.category && (
                <span style={{ color: '#94a3b8', fontWeight: 600 }}> · {pattern.category}</span>
              )}
            </h3>
          </div>

          <ChevronRight size={20} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 4 }} />
        </div>

        {/* Description */}
        {pattern.description && (
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              margin: 0,
              lineHeight: 1.5,
            }}
            className="line-clamp-2"
          >
            {pattern.description}
          </p>
        )}

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: '#64748b',
            fontWeight: 600,
          }}
        >
          {pattern.occurrence_count && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} style={{ color: '#94a3b8' }} />
              {pattern.occurrence_count} occurrences
            </span>
          )}
          {pattern.affected_area && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} style={{ color: '#94a3b8' }} />
              {pattern.affected_area}
            </span>
          )}
          {pattern.predicted_next_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} style={{ color: '#94a3b8' }} />
              Next: {formatDate(pattern.predicted_next_at)}
            </span>
          )}
        </div>

        {/* Confidence bar */}
        {pattern.confidence_score != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: '#f1f5f9',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(pattern.confidence_score * 100)}%`,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
              {Math.round(pattern.confidence_score * 100)}% conf.
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{ display: 'flex', gap: 8, marginTop: 2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onViewDetail(pattern)}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 10,
              background: '#f1f5f9',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            className="hover:bg-slate-200"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={() => onResolve(pattern.id)}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'opacity 0.15s',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Resolving…
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Resolve
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
