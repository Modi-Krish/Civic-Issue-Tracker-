'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Calendar, Clock, AlertTriangle, CheckCircle2, TrendingUp, User, ArrowRight, ShieldCheck, Wrench } from 'lucide-react';

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

  const mappedIssues = detailData?.mappedIssues || [];
  const timelineEvents = detailData?.timelineEvents || [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, backdropFilter: "blur(8px)" }} className="flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        style={{
          background: "#121215",
          border: "1.5px solid rgba(255,255,255,0.1)",
          color: "white"
        }}
        className="w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 relative shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 12,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "white", cursor: "pointer"
          }}
          className="flex items-center justify-center active:scale-95 transition-transform">
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="mb-5 pr-10">
          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", textTransform: "uppercase" }}>
            {pattern.severity_level} SEVERITY PATTERN
          </span>
          <h2 className="text-lg sm:text-2xl font-black mt-2 mb-1 capitalize text-white">
            {pattern.category_id} Cluster History & Prediction
          </h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} className="flex items-center gap-1.5 truncate">
            <MapPin size={14} color="#0ea5e9" className="shrink-0" />
            <span className="truncate">
              {pattern.location_description || `Centroid (${pattern.cluster_lat.toFixed(4)}, ${pattern.cluster_lng.toFixed(4)})`}
            </span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 p-3.5 rounded-2xl bg-black/30 border border-white/5">
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Risk Score</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: pattern.risk_score >= 70 ? "#ef4444" : "#fbbf24" }}>{pattern.risk_score} / 100</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Confidence</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0ea5e9" }}>{pattern.prediction_confidence}%</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Median Interval</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>{pattern.median_interval_days} Days</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Predicted Next</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", marginTop: 2 }}>{new Date(pattern.predicted_next_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Recommendation Box */}
        {pattern.recommendation_text && (
          <div className="bg-sky-500/10 border border-sky-500/25 rounded-2xl p-4 mb-5">
            <h4 style={{ fontSize: 11, fontWeight: 800, color: "#0ea5e9", textTransform: "uppercase", margin: "0 0 4px" }}>Automated Rule Recommendation</h4>
            <p style={{ fontSize: 13, color: "white", margin: 0, lineHeight: 1.5 }}>{pattern.recommendation_text}</p>
          </div>
        )}

        {/* Status Lifecycle Actions */}
        <div className="mb-5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>Update Pattern Lifecycle Status</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onStatusChange(pattern.id, 'UNDER_INVESTIGATION')}
              style={{ minHeight: 40 }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${pattern.status === 'UNDER_INVESTIGATION' ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/5 text-white border-white/10'}`}>
              🔍 Under Investigation
            </button>
            <button
              onClick={() => onStatusChange(pattern.id, 'MAINTENANCE_SCHEDULED')}
              style={{ minHeight: 40 }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${pattern.status === 'MAINTENANCE_SCHEDULED' ? 'bg-purple-500 text-white border-purple-400' : 'bg-white/5 text-white border-white/10'}`}>
              🛠️ Maintenance Scheduled
            </button>
            <button
              onClick={() => onStatusChange(pattern.id, 'RESOLVED')}
              style={{ minHeight: 40 }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${pattern.status === 'RESOLVED' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/5 text-white border-white/10'}`}>
              ✅ Mark Resolved
            </button>
          </div>
        </div>

        {/* Incident History Timeline */}
        <div>
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3">Linked Complaint Timeline</h3>
          {loading ? (
            <div className="text-center py-6 text-xs text-white/40">Loading historical timeline...</div>
          ) : timelineEvents.length === 0 ? (
            <div className="text-center py-6 text-xs text-white/40 bg-white/[0.01] rounded-2xl border border-white/5">
              Historical incidents linked to this spatial centroid.
            </div>
          ) : (
            <div className="space-y-2.5">
              {timelineEvents.map((evt: any, index: number) => (
                <div key={index} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <div>
                      <div className="font-bold text-white">Complaint #{evt.issue_id || evt.id}</div>
                      <div className="text-[11px] text-white/50">{new Date(evt.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/5 text-white/70 border border-white/10">
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
