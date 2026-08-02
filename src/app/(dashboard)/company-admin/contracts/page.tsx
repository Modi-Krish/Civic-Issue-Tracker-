'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, Calendar, Clock, MapPin, Building, AlertCircle, FileText, CheckCircle2, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  insetSoft:`inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

interface ContractWithDetails {
  id: string;
  tender_id: string;
  company_id: string;
  department_id: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: number;
  sla_tier: string;
  target_resolution_hours: number;
  departments?: { name: string; slug: string };
  tenders?: { title: string; tender_number: string };
  assigned_issues_count?: number;
  resolved_issues_count?: number;
}

export default function MyContractsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompanyContracts() {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { getPossibleCompanyIds } = await import('@/lib/utils/uuid');
        const userId = user.id || user.uid || '';
        
        let cid = userId;
        const possibleIds = new Set<string>(getPossibleCompanyIds(userId));

        const { data: empData } = await supabase
          .from('company_employees')
          .select('company_id')
          .eq('profile_id', userId)
          .maybeSingle();

        if (empData?.company_id) {
          cid = empData.company_id;
          getPossibleCompanyIds(empData.company_id).forEach(id => possibleIds.add(id));
        }
        setCompanyId(cid);

        const idList = Array.from(possibleIds);

        // Fetch contracts for this company via Server API (bypasses RLS)
        const resContracts = await fetch(`/api/company/contracts?company_id=${cid}`);
        const contractsJson = await resContracts.json();
        if (contractsJson.contracts) {
          setContracts(contractsJson.contracts);
        }

      } catch (err) {
        console.error("Error loading company contracts:", err);
      } finally {
        setLoading(false);
      }


    }

    fetchCompanyContracts();
  }, [user, authLoading]);

  const calculateDaysRemaining = (endDateStr: string) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const getDerivedStatus = (contract: ContractWithDetails) => {
    if (contract.status === 'Terminated' || contract.status === 'Cancelled') return 'CANCELLED';
    const now = new Date();
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);

    if (now < start) return 'UPCOMING';
    if (now > end || contract.status === 'Expired') return 'EXPIRED';
    return 'ACTIVE';
  };

  const filteredContracts = contracts.filter(c => {
    const derived = getDerivedStatus(c);
    if (filter === 'ALL') return true;
    return derived === filter;
  });

  return (
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter', sans-serif", color: T.text1, padding: "32px 24px 80px", maxWidth: "100%", margin: "0 auto" }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/company-admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: T.text3, fontWeight: 700, textDecoration: "none", marginBottom: 16 }}>
          <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back to Operations
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px", color: T.text1 }}>My Contracts</h1>
            <p style={{ color: T.text3, margin: 0, fontSize: 14, fontWeight: 600 }}>Overview of active, upcoming, expired, and cancelled government contracts.</p>
          </div>
          <div style={{ padding: "8px 16px", borderRadius: 14, background: "#E1F5EE", border: "1px solid #1D9E7530", color: "#1D9E75", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", boxShadow: SH.raisedSm }}>
            {contracts.filter(c => getDerivedStatus(c) === 'ACTIVE').length} Active Contracts
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, borderBottom: `2px dashed ${T.border}`, paddingBottom: 16, overflowX: "auto" }} className="no-scrollbar">
        {[
          { key: 'ALL', label: 'All Contracts' },
          { key: 'ACTIVE', label: 'Active' },
          { key: 'UPCOMING', label: 'Upcoming' },
          { key: 'EXPIRED', label: 'Expired' },
          { key: 'CANCELLED', label: 'Cancelled' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: "12px 20px",
              borderRadius: 14,
              background: filter === tab.key ? `linear-gradient(135deg, ${T.accent}, ${T.accentDark})` : T.raised,
              color: filter === tab.key ? "white" : T.text3,
              fontSize: 12,
              fontWeight: 900,
              border: filter === tab.key ? "none" : `1px solid ${T.border}`,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: filter === tab.key ? `${SH.raisedSm}, 0 4px 12px ${T.accent}40` : SH.raisedSm,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contracts Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: T.text3, fontSize: 14, fontWeight: 700 }}>Loading awarded contracts...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: T.base, borderRadius: 24, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
          <FileText size={48} color={T.text3} style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px", color: T.text1 }}>No {filter.toLowerCase()} contracts found</h3>
          <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 600 }}>Contract awards for your company will be tracked here automatically.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
          {filteredContracts.map(c => {
            const derivedStatus = getDerivedStatus(c);
            const remainingDays = calculateDaysRemaining(c.end_date);
            const deptName = c.departments?.name || 'Municipal Works';
            const tenderNum = c.tenders?.tender_number || `CNT-${c.id.slice(0, 8)}`;
            const tenderTitle = c.tenders?.title || 'Civic Infrastructure Contract';

            const statusColors: Record<string, { bg: string; color: string; label: string }> = {
              ACTIVE: { bg: "#EAF3DE", color: "#27500A", label: "Active Contract" },
              UPCOMING: { bg: "#E6F1FB", color: "#0C447C", label: "Upcoming" },
              EXPIRED: { bg: "#FCEBEB", color: "#791F1F", label: "Expired" },
              CANCELLED: { bg: T.raised, color: T.text3, label: "Cancelled" },
            };

            const st = statusColors[derivedStatus] || statusColors.ACTIVE;

            return (
              <div key={c.id} style={{ padding: 24, borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: SH.raised }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.color}30`, textTransform: "uppercase", letterSpacing: "0.08em", boxShadow: SH.raisedSm }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: 11, color: T.text3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      SLA: <strong style={{ color: T.text1 }}>{c.sla_tier || 'Standard'}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px", color: T.text1, letterSpacing: "-0.02em" }}>{tenderTitle}</h3>
                  <p style={{ fontSize: 12, color: "#0C447C", fontWeight: 800, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {deptName} • {tenderNum}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16, borderRadius: 16, background: T.base, border: `1px solid ${T.border}`, marginBottom: 20, boxShadow: SH.insetSoft }}>
                    <div>
                      <p style={{ fontSize: 10, color: T.text3, margin: "0 0 4px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Start Date</p>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: T.text1 }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: T.text3, margin: "0 0 4px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>End Date</p>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: T.text1 }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.text3, fontWeight: 800, borderTop: `1px dashed ${T.border}`, paddingTop: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} color="#854F0B" />
                      Remaining: <strong style={{ color: remainingDays <= 30 ? "#791F1F" : "#854F0B", fontSize: 14 }}>{remainingDays} Days</strong>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Star size={16} color="#854F0B" /> <strong style={{ color: T.text1 }}>4.8</strong> Perf
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
