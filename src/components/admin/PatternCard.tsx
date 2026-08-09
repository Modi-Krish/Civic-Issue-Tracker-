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

interface PatternCardProps {
  pattern: any;
  onViewDetail: (pattern: any) => void;
  onResolve: (patternId: string) => void;
  loadingId: string | null;
}

const severityConfig: Record<string, { accentBar: string; badgeBg: string; badgeText: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: {
    accentBar: '#791F1F',
    badgeBg: '#FCEBEB',
    badgeText: '#791F1F',
    icon: <ShieldAlert size={14} />,
    label: 'Critical',
  },
  HIGH: {
    accentBar: '#854F0B',
    badgeBg: '#FAEEDA',
    badgeText: '#854F0B',
    icon: <AlertTriangle size={14} />,
    label: 'High',
  },
  MEDIUM: {
    accentBar: '#0C447C',
    badgeBg: '#E6F1FB',
    badgeText: '#0C447C',
    icon: <AlertTriangle size={14} />,
    label: 'Medium',
  },
  LOW: {
    accentBar: '#085041',
    badgeBg: '#E1F5EE',
    badgeText: '#085041',
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
        borderRadius: 20,
        border: `1px solid ${T.border}`,
        background: T.raised,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'pointer',
        boxShadow: SH.raised,
      }}
      className="hover:shadow-lg hover:-translate-y-0.5"
      onClick={() => onViewDetail(pattern)}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: severity.accentBar }} />

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
                  borderRadius: 10,
                  background: severity.badgeBg,
                  color: severity.badgeText,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  boxShadow: SH.raisedSm,
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
                    borderRadius: 10,
                    background: '#FCEBEB',
                    color: '#791F1F',
                    fontSize: 11,
                    fontWeight: 700,
                    animation: 'pulse 2s infinite',
                    boxShadow: SH.raisedSm,
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
                    borderRadius: 10,
                    background: pattern.status === 'MONITORING' ? '#E6F1FB' : T.base,
                    color: pattern.status === 'MONITORING' ? '#0C447C' : T.text2,
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: SH.raisedSm,
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
                color: T.text1,
                margin: 0,
                lineHeight: 1.35,
                letterSpacing: '-0.02em',
              }}
              className="line-clamp-2"
            >
              {pattern.pattern_type?.replace(/_/g, ' ') || 'Unknown Pattern'}
              {pattern.category && (
                <span style={{ color: T.text3, fontWeight: 600 }}> · {pattern.category}</span>
              )}
            </h3>
          </div>

          <ChevronRight size={20} style={{ color: T.text3, flexShrink: 0, marginTop: 4 }} />
        </div>

        {/* Description */}
        {pattern.description && (
          <p
            style={{
              fontSize: 13,
              color: T.text2,
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
            color: T.text2,
            fontWeight: 600,
          }}
        >
          {pattern.occurrence_count && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} style={{ color: T.text3 }} />
              {pattern.occurrence_count} occurrences
            </span>
          )}
          {pattern.affected_area && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} style={{ color: T.text3 }} />
              {pattern.affected_area}
            </span>
          )}
          {pattern.predicted_next_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} style={{ color: T.text3 }} />
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
                height: 8,
                borderRadius: 99,
                background: T.base,
                overflow: 'hidden',
                boxShadow: SH.insetSoft,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(pattern.confidence_score * 100)}%`,
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text2, flexShrink: 0 }}>
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
              borderRadius: 12,
              background: T.base,
              color: T.text1,
              fontSize: 12,
              fontWeight: 700,
              border: `1px solid ${T.border}`,
              cursor: 'pointer',
              transition: 'background 0.15s',
              boxShadow: SH.raisedSm,
            }}
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
              borderRadius: 12,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
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
              boxShadow: SH.raisedSm,
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
