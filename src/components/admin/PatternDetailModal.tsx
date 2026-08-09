'use client';

import React from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  MapPin,
  Clock,
  TrendingUp,
  CalendarClock,
  FileText,
  Tag,
  Activity,
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

interface PatternDetailModalProps {
  pattern: any;
  onClose: () => void;
  onStatusChange: (patternId: string, newStatus: string) => void;
}

const severityConfig: Record<string, { headerBg: string; headerText: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: { headerBg: '#791F1F', headerText: '#fff', icon: <ShieldAlert size={18} />, label: 'Critical' },
  HIGH:     { headerBg: '#854F0B', headerText: '#fff', icon: <AlertTriangle size={18} />, label: 'High' },
  MEDIUM:   { headerBg: '#0C447C', headerText: '#fff', icon: <AlertTriangle size={18} />, label: 'Medium' },
  LOW:      { headerBg: '#085041', headerText: '#fff', icon: <Info size={18} />, label: 'Low' },
};

const statusOptions = ['ACTIVE', 'MONITORING', 'ACKNOWLEDGED', 'RESOLVED'] as const;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysUntil(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Math.round((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Overdue';
  if (diff === 1) return '1 day';
  return `${diff} days`;
}

export default function PatternDetailModal({ pattern, onClose, onStatusChange }: PatternDetailModalProps) {
  const severity = severityConfig[pattern.severity_level] || severityConfig.LOW;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(44, 44, 42, 0.5)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          borderRadius: 24,
          background: T.raised,
          boxShadow: `0 25px 60px -12px rgba(0, 0, 0, 0.25), ${SH.raised}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 22px 16px',
            background: severity.headerBg,
            color: severity.headerText,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                opacity: 0.9,
              }}
            >
              {severity.icon}
              {severity.label} Severity
            </span>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
              }}
            >
              {pattern.pattern_type?.replace(/_/g, ' ') || 'Pattern Detail'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            className="hover:bg-white/30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18, background: T.raised }}>
          {/* Description */}
          {pattern.description && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                <FileText size={13} />
                Description
              </div>
              <p style={{ fontSize: 14, color: T.text2, lineHeight: 1.6, margin: 0 }}>
                {pattern.description}
              </p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {pattern.occurrence_count != null && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  <TrendingUp size={13} />
                  Occurrences
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.text1, letterSpacing: '-0.04em' }}>{pattern.occurrence_count}</div>
              </div>
            )}

            {pattern.confidence_score != null && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  <Activity size={13} />
                  Confidence
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.text1, letterSpacing: '-0.04em' }}>{Math.round(pattern.confidence_score * 100)}%</div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 99, background: T.base, overflow: 'hidden', boxShadow: SH.insetSoft }}>
                  <div style={{ height: '100%', width: `${Math.round(pattern.confidence_score * 100)}%`, borderRadius: 99, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )}

            {pattern.affected_area && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  <MapPin size={13} />
                  Affected Area
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{pattern.affected_area}</div>
              </div>
            )}

            {pattern.category && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  <Tag size={13} />
                  Category
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{pattern.category}</div>
              </div>
            )}
          </div>

          {/* Prediction info */}
          {pattern.predicted_next_at && (
            <div style={{ padding: '14px 16px', borderRadius: 16, background: T.accentTint, border: `1px solid ${T.accent}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: T.accentDark, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                <CalendarClock size={13} />
                Predicted Next Occurrence
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.accentDark }}>{formatDate(pattern.predicted_next_at)}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: getDaysUntil(pattern.predicted_next_at) === 'Overdue' ? '#791F1F' : T.accentDark,
                  padding: '3px 8px',
                  borderRadius: 8,
                  background: getDaysUntil(pattern.predicted_next_at) === 'Overdue' ? '#FCEBEB' : T.accentTint,
                  boxShadow: SH.raisedSm,
                }}>
                  {getDaysUntil(pattern.predicted_next_at)}
                </span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: T.text3, fontWeight: 600 }}>
            {pattern.first_seen_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                First seen: {formatDate(pattern.first_seen_at)}
              </span>
            )}
            {pattern.last_seen_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                Last seen: {formatDate(pattern.last_seen_at)}
              </span>
            )}
          </div>

          {/* Status change */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Update Status
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(pattern.id, status)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    border: pattern.status === status ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                    cursor: 'pointer',
                    background: pattern.status === status ? T.accentTint : T.raised,
                    color: pattern.status === status ? T.accentDark : T.text2,
                    boxShadow: pattern.status === status ? SH.insetSoft : SH.raisedSm,
                    transition: 'all 0.15s',
                    letterSpacing: '0.04em',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
