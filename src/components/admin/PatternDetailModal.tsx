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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#121215", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 24, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative", color: "white" }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 20, right: 20, width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", textTransform: "uppercase" }}>
            {pattern.severity_level} SEVERITY PATTERN
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: "10px 0 4px" }}>
            {pattern.category_id} Cluster History & Prediction
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={14} color="#0ea5e9" /> {pattern.location_description} ({pattern.cluster_lat.toFixed(4)}, {pattern.cluster_lng.toFixed(4)})
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Risk Score</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: pattern.risk_score >= 70 ? "#ef4444" : "#fbbf24" }}>{pattern.risk_score} / 100</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Confidence</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0ea5e9" }}>{pattern.prediction_confidence}%</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Median Interval</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>{pattern.median_interval_days} Days</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Predicted Next</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>{new Date(pattern.predicted_next_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Recommendation Box */}
        {pattern.recommendation_text && (
          <div style={{ background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.25)", borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: "#0ea5e9", margin: "0 0 4px", textTransform: "uppercase" }}>Automated Rule Recommendation</h4>
            <p style={{ fontSize: 13, color: "white", margin: 0 }}>{pattern.recommendation_text}</p>
          </div>
        )}

        {/* Status Lifecycle Actions */}
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>Update Pattern Lifecycle Status</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => onStatusChange(pattern.id, 'UNDER_INVESTIGATION')}
              style={{ padding: "8px 14px", borderRadius: 10, background: pattern.status === 'UNDER_INVESTIGATION' ? "#0ea5e9" : "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
              🔍 Under Investigation
            </button>
            <button
              onClick={() => onStatusChange(pattern.id, 'INFRASTRUCTURE_UPGRADE')}
              style={{ padding: "8px 14px", borderRadius: 10, background: pattern.status === 'INFRASTRUCTURE_UPGRADE' ? "#8b5cf6" : "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
              🛠️ Upgrade Scheduled
            </button>
            <button
              onClick={() => onStatusChange(pattern.id, 'RESOLVED')}
              style={{ padding: "8px 14px", borderRadius: 10, background: pattern.status === 'RESOLVED' ? "#10b981" : "rgba(16, 185, 129, 0.2)", color: "#10b981", fontSize: 12, fontWeight: 700, border: "1px solid rgba(16, 185, 129, 0.3)", cursor: "pointer" }}>
              ✔️ Mark Resolved & Fixed
            </button>
          </div>
        </div>

        {/* Mapped Complaints Timeline */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
            Complaint Cluster Timeline ({mappedIssues.length || pattern.occurrence_count} Occurrences)
          </h3>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading cluster complaints...</div>
          ) : mappedIssues.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No individual complaints mapped yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mappedIssues.map((issue: any, index: number) => (
                <div key={issue.id} style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, margin: "0 0 2px" }}>{issue.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      Reported on {new Date(issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at).toLocaleDateString()} • Status: {issue.status}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 8, background: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9" }}>
                    Occurrence #{index + 1}
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
