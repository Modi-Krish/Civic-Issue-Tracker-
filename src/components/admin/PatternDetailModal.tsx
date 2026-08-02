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

interface PatternDetailModalProps {
  pattern: any;
  onClose: () => void;
  onStatusChange: (patternId: string, newStatus: string) => void;
}

const severityConfig: Record<string, { gradient: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: { gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', icon: <ShieldAlert size={18} />, label: 'Critical' },
  HIGH: { gradient: 'linear-gradient(135deg, #ea580c, #c2410c)', icon: <AlertTriangle size={18} />, label: 'High' },
  MEDIUM: { gradient: 'linear-gradient(135deg, #d97706, #b45309)', icon: <AlertTriangle size={18} />, label: 'Medium' },
  LOW: { gradient: 'linear-gradient(135deg, #16a34a, #15803d)', icon: <Info size={18} />, label: 'Low' },
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
          background: 'rgba(15, 23, 42, 0.6)',
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
          borderRadius: 22,
          background: '#ffffff',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.25)',
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
            background: severity.gradient,
            color: '#fff',
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
                letterSpacing: 0.5,
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
        <div style={{ overflowY: 'auto', padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Description */}
          {pattern.description && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                <FileText size={13} />
                Description
              </div>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                {pattern.description}
              </p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {pattern.occurrence_count != null && (
              <div style={{ padding: '14px 16px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                  <TrendingUp size={13} />
                  Occurrences
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{pattern.occurrence_count}</div>
              </div>
            )}

            {pattern.confidence_score != null && (
              <div style={{ padding: '14px 16px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                  <Activity size={13} />
                  Confidence
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{Math.round(pattern.confidence_score * 100)}%</div>
                <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(pattern.confidence_score * 100)}%`, borderRadius: 3, background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )}

            {pattern.affected_area && (
              <div style={{ padding: '14px 16px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                  <MapPin size={13} />
                  Affected Area
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{pattern.affected_area}</div>
              </div>
            )}

            {pattern.category && (
              <div style={{ padding: '14px 16px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                  <Tag size={13} />
                  Category
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{pattern.category}</div>
              </div>
            )}
          </div>

          {/* Prediction info */}
          {pattern.predicted_next_at && (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                <CalendarClock size={13} />
                Predicted Next Occurrence
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1e40af' }}>{formatDate(pattern.predicted_next_at)}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: getDaysUntil(pattern.predicted_next_at) === 'Overdue' ? '#dc2626' : '#3b82f6',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: getDaysUntil(pattern.predicted_next_at) === 'Overdue' ? '#fef2f2' : '#dbeafe',
                }}>
                  {getDaysUntil(pattern.predicted_next_at)}
                </span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
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
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
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
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: pattern.status === status ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: pattern.status === status ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' : '#f8fafc',
                    color: pattern.status === status ? '#fff' : '#475569',
                    transition: 'all 0.15s',
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
