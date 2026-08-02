'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, Map, FileText, AlertTriangle, ShieldCheck, ArrowRight, BarChart3, Users, Edit2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import PublishTenderModal from '@/components/ui/PublishTenderModal';
import type { Tender } from '@/lib/types/database';

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:    `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
  insetSoft:`inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

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
    minHeight: "100dvh", background: T.base, fontFamily: "'Inter', sans-serif",
    color: T.text1, padding: "32px 24px", maxWidth: "100%", margin: "0 auto"
  };

  const statCardStyle = {
    padding: 24, borderRadius: 24,
    background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised,
    display: "flex", alignItems: "center", gap: 20
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px", color: T.text1 }}>City Command Center</h1>
          <p style={{ color: T.text3, margin: 0, fontSize: 14, fontWeight: 600 }}>Oversee city infrastructure, issue tenders, and approve contractor works.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/department/tenders" style={{
            padding: "12px 20px", borderRadius: 14, background: T.raised, border: `1px solid ${T.border}`,
            color: T.text1, fontSize: 13, fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
            boxShadow: SH.raisedSm
          }}>
            <FileText size={16} color={T.accent} /> Manage All Tenders
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "12px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
              boxShadow: `${SH.raisedSm}, 0 8px 24px ${T.accent}40`, display: "flex", alignItems: "center", gap: 8
            }}>
            <FileText size={16} /> Publish New Tender
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", color: "#0C447C", boxShadow: SH.insetSoft }}>
            <Briefcase size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Published Tenders</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{loading ? '-' : stats.openTenders}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", color: "#27500A", boxShadow: SH.insetSoft }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Active Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{loading ? '-' : stats.activeContracts}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FAEEDA", display: "flex", alignItems: "center", justifyContent: "center", color: "#854F0B", boxShadow: SH.insetSoft }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Reported Incidents</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{loading ? '-' : stats.reportedIssues}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, boxShadow: SH.raised }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>Live Published Tenders</h2>
            <Link href="/department/tenders" style={{ fontSize: 13, fontWeight: 800, color: T.accent, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View & Edit All <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tenders.length === 0 ? (
              <p style={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>No tenders published yet.</p>
            ) : (
              tenders.slice(0, 5).map(t => (
                <div key={t.id} style={{ padding: 20, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, boxShadow: SH.insetSoft, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#0C447C", background: "#E6F1FB", padding: "4px 10px", borderRadius: 99, boxShadow: SH.raisedSm }}>{t.tender_number}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#27500A", background: "#EAF3DE", padding: "4px 10px", borderRadius: 99, boxShadow: SH.raisedSm }}>{t.status}</span>
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px", color: T.text1, letterSpacing: '-0.01em' }}>{t.title}</h4>
                    <p style={{ fontSize: 12, color: T.text2, margin: 0, fontWeight: 600 }}>Budget: ${t.estimated_budget?.toLocaleString()} • Type: {t.tender_type}</p>
                  </div>
                  <Link href={`/admin/tenders/evaluate?tender_id=${t.id}`} style={{ padding: "10px 18px", borderRadius: 12, background: T.raised, border: `1px solid ${T.border}`, color: T.accentDark, fontSize: 12, fontWeight: 800, textDecoration: "none", boxShadow: SH.raisedSm }}>
                    Evaluate Bids
                  </Link>

                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, flex: 1, display: "flex", flexDirection: "column", boxShadow: SH.raised }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 24px", color: T.text1, letterSpacing: '-0.02em' }}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/department/tenders" style={{ padding: 16, borderRadius: 16, background: T.base, border: `1px solid ${T.border}`, color: T.text1, textDecoration: "none", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: SH.insetSoft }}>
                <span>View & Edit Tenders</span>
                <ArrowRight size={14} color={T.accent} />
              </Link>
              <Link href="/admin/tenders/evaluate" style={{ padding: 16, borderRadius: 16, background: T.base, border: `1px solid ${T.border}`, color: T.text1, textDecoration: "none", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: SH.insetSoft }}>
                <span>Evaluate Bids & Award</span>
                <ArrowRight size={14} color="#854F0B" />
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
