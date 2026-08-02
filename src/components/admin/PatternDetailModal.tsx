'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, CheckCircle2, ShieldCheck, Wrench, Search } from 'lucide-react';

interface PatternDetailModalProps {
  pattern: any | null;
  onClose: () => void;
  onStatusChange: (patternId: string, newStatus: string) => void;
}

export default function PatternDetailModal({ pattern, onClose, onStatusChange }: PatternDetailModalProps) {
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pattern?.id) return;
    async function loadDetail() {
      try {
        const res = await fetch(`/api/analytics/patterns/${pattern.id}`);
        const json = await res.json();
        if (json.pattern) {
          setDetailData(json);
        }
      } catch (err) {
        console.error('Error loading pattern detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [pattern]);

  if (!pattern) return null;

  const timelineEvents = detailData?.timelineEvents || [];

  const severityColor =
    pattern.severity_level === 'CRITICAL' ? '#dc2626' :
    pattern.severity_level === 'HIGH' ? '#ea580c' :
    pattern.severity_level === 'MEDIUM' ? '#d97706' : '#64748b';

  const severityBg =
    pattern.severity_level === 'CRITICAL' ? '#fef2f2' :
    pattern.severity_level === 'HIGH' ? '#fff7ed' :
    pattern.severity_level === 'MEDIUM' ? '#fffbeb' : '#f1f5f9';

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, backdropFilter: "blur(4px)" }} className="flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        style={{
          background: "#ffffff",
          border: "1.5px solid #e2e8f0",
          color: "#0f172a"
        }}
        className="w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 relative shadow-2xl">

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 12,
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            color: "#0f172a", cursor: "pointer"
          }}
          className="flex items-center justify-center active:scale-95 transition-transform">
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="mb-5 pr-10 leading-normal">
          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: severityBg, color: severityColor, border: `1px solid ${severityColor}35`, textTransform: "uppercase" }}>
            {pattern.severity_level} SEVERITY PATTERN
          </span>
          <h2 style={{ color: "#0f172a" }} className="text-lg sm:text-2xl font-black mt-2 mb-1 capitalize leading-snug">
            {pattern.category_id} Cluster History & Prediction
          </h2>
          <p style={{ fontSize: 12, color: "#64748b" }} className="flex items-center gap-1.5 truncate">
            <MapPin size={14} color="#0ea5e9" className="shrink-0" />
            <span className="truncate">
              {pattern.location_description || `Centroid (${pattern.cluster_lat.toFixed(4)}, ${pattern.cluster_lng.toFixed(4)})`}
            </span>
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 p-3.5 rounded-2xl text-left">
          <div>
            <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Risk Score</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: pattern.risk_score >= 70 ? "#dc2626" : "#d97706" }}>{pattern.risk_score} / 100</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Confidence</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0284c7" }}>{pattern.prediction_confidence}%</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Median Interval</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{pattern.median_interval_days} Days</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Predicted Next</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>{new Date(pattern.predicted_next_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Recommendation Box */}
        {pattern.recommendation_text && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }} className="rounded-2xl p-4 mb-5 leading-relaxed">
            <h4 style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", margin: "0 0 4px" }}>Automated Rule Recommendation</h4>
            <p style={{ fontSize: 13, color: "#0f172a", margin: 0, lineHeight: 1.5 }}>{pattern.recommendation_text}</p>
          </div>
        )}

        {/* Status Lifecycle Actions */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} className="mb-5 p-4 rounded-2xl">
          <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Update Pattern Lifecycle Status</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStatusChange(pattern.id, 'UNDER_INVESTIGATION')}
              style={{
                minHeight: 40,
                background: pattern.status === 'UNDER_INVESTIGATION' ? '#0ea5e9' : '#ffffff',
                color: pattern.status === 'UNDER_INVESTIGATION' ? '#ffffff' : '#334155',
                borderColor: pattern.status === 'UNDER_INVESTIGATION' ? '#0ea5e9' : '#e2e8f0'
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5">
              <Search size={14} /> Under Investigation
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(pattern.id, 'MAINTENANCE_SCHEDULED')}
              style={{
                minHeight: 40,
                background: pattern.status === 'MAINTENANCE_SCHEDULED' ? '#8b5cf6' : '#ffffff',
                color: pattern.status === 'MAINTENANCE_SCHEDULED' ? '#ffffff' : '#334155',
                borderColor: pattern.status === 'MAINTENANCE_SCHEDULED' ? '#8b5cf6' : '#e2e8f0'
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5">
              <Wrench size={14} /> Maintenance Scheduled
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(pattern.id, 'RESOLVED')}
              style={{
                minHeight: 40,
                background: pattern.status === 'RESOLVED' ? '#10b981' : '#ffffff',
                color: pattern.status === 'RESOLVED' ? '#ffffff' : '#334155',
                borderColor: pattern.status === 'RESOLVED' ? '#10b981' : '#e2e8f0'
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Mark Resolved
            </button>
          </div>
        </div>

        {/* Incident History Timeline */}
        <div>
          <h3 style={{ color: "#0f172a" }} className="text-sm font-extrabold uppercase tracking-wider mb-3">Linked Complaint Timeline</h3>
          {loading ? (
            <div style={{ color: "#94a3b8" }} className="text-center py-6 text-xs">Loading historical timeline...</div>
          ) : timelineEvents.length === 0 ? (
            <div style={{ color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0" }} className="text-center py-6 text-xs rounded-2xl">
              Historical incidents linked to this spatial centroid.
            </div>
          ) : (
            <div className="space-y-2.5">
              {timelineEvents.map((evt: any, index: number) => (
                <div key={index} style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} className="p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <div>
                      <div style={{ color: "#0f172a" }} className="font-bold">Complaint #{evt.issue_id || evt.id}</div>
                      <div style={{ color: "#94a3b8" }} className="text-[11px]">{new Date(evt.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }} className="text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0">
                    {evt.status || 'RESOLVED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}