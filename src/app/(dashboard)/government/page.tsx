'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, Map, FileText, AlertTriangle, ShieldCheck, ArrowRight, BarChart3, Users, Edit2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import PublishTenderModal from '@/components/ui/PublishTenderModal';
import type { Tender } from '@/lib/types/database';

export default function GovernmentDashboard() {
  const [stats, setStats] = useState({ openTenders: 0, activeContracts: 0, reportedIssues: 0 });
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch published tenders from Supabase
        const { data: tenderData, count: tenderCount } = await supabase
          .from('tenders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (tenderData) setTenders(tenderData as Tender[]);

        const { count: contractCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Active', 'ACTIVE']);


        const { collection, query, where, getCountFromServer } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const qReported = query(collection(db, 'issues'), where('status', '==', 'REPORTED'));
        const snapReported = await getCountFromServer(qReported);

        setStats({
          openTenders: tenderCount || 0,
          activeContracts: contractCount || 0,
          reportedIssues: snapReported.data().count,
        });
      } catch (error) {
        console.error("Error loading government stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', sans-serif",
    color: "#ffffff", padding: "32px 24px", maxWidth: 1200, margin: "0 auto"
  };

  const statCardStyle = {
    padding: 24, borderRadius: 24,
    background: "rgba(255,255,255,0.02)", border: "1.5px solid rgba(255,255,255,0.05)",
    display: "flex", alignItems: "center", gap: 20
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>City Command Center</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>Oversee city infrastructure, issue tenders, and approve contractor works.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/department/tenders" style={{
            padding: "12px 20px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "white", fontSize: 13, fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", gap: 8
          }}>
            <FileText size={16} /> Manage All Tenders
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "12px 24px", borderRadius: 14, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
              color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
              boxShadow: "0 8px 24px rgba(14, 165, 233, 0.3)", display: "flex", alignItems: "center", gap: 8
            }}>
            <FileText size={16} /> Publish New Tender
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(14, 165, 233, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9" }}>
            <Briefcase size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Published Tenders</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.openTenders}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Active Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.activeContracts}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Reported Incidents</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.reportedIssues}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Live Published Tenders</h2>
            <Link href="/department/tenders" style={{ fontSize: 13, fontWeight: 700, color: "#0ea5e9", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View & Edit All <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tenders.length === 0 ? (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No tenders published yet.</p>
            ) : (
              tenders.slice(0, 5).map(t => (
                <div key={t.id} style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "2px 8px", borderRadius: 99 }}>{t.tender_number}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 99 }}>{t.status}</span>
                    </div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{t.title}</h4>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Budget: ${t.estimated_budget?.toLocaleString()} • Type: {t.tender_type}</p>
                  </div>
                  <Link href={`/admin/tenders/evaluate?tender_id=${t.id}`} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(14, 165, 233, 0.1)", color: "#0ea5e9", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    Evaluate Bids
                  </Link>

                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32, flex: 1, display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/department/tenders" style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "white", textDecoration: "none", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>View & Edit Tenders</span>
                <ArrowRight size={14} color="#0ea5e9" />
              </Link>
              <Link href="/admin/tenders/evaluate" style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "white", textDecoration: "none", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Evaluate Bids & Award</span>
                <ArrowRight size={14} color="#8b5cf6" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PublishTenderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        departmentId="electricity" 
      />
    </div>
  );
}
