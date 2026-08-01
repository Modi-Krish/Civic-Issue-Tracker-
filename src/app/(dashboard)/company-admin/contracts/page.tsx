'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, Calendar, Clock, MapPin, Building, AlertCircle, FileText, CheckCircle2, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';

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
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', sans-serif", color: "#ffffff", padding: "32px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/company-admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 12 }}>
          <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to Operations
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>My Contracts</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>Overview of active, upcoming, expired, and cancelled government contracts.</p>
          </div>
          <div style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#10b981", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {contracts.filter(c => getDerivedStatus(c) === 'ACTIVE').length} Active Contracts
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16, overflowX: "auto" }}>
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
              padding: "10px 18px",
              borderRadius: 12,
              background: filter === tab.key ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
              color: filter === tab.key ? "white" : "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontWeight: 800,
              border: filter === tab.key ? "none" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contracts Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#0ea5e9", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading awarded contracts...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)" }}>
          <FileText size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No {filter.toLowerCase()} contracts found</h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Contract awards for your company will be tracked here automatically.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
          {filteredContracts.map(c => {
            const derivedStatus = getDerivedStatus(c);
            const remainingDays = calculateDaysRemaining(c.end_date);
            const deptName = c.departments?.name || 'Municipal Works';
            const tenderNum = c.tenders?.tender_number || `CNT-${c.id.slice(0, 8)}`;
            const tenderTitle = c.tenders?.title || 'Civic Infrastructure Contract';

            const statusColors: Record<string, { bg: string; color: string; label: string }> = {
              ACTIVE: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", label: "Active Contract" },
              UPCOMING: { bg: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9", label: "Upcoming" },
              EXPIRED: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", label: "Expired" },
              CANCELLED: { bg: "rgba(255, 255, 255, 0.08)", color: "rgba(255, 255, 255, 0.5)", label: "Cancelled" },
            };

            const st = statusColors[derivedStatus] || statusColors.ACTIVE;

            return (
              <div key={c.id} style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 99, background: st.bg, color: st.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                      SLA: <strong style={{ color: "white" }}>{c.sla_tier || 'Standard'}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{tenderTitle}</h3>
                  <p style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 700, margin: "0 0 16px" }}>
                    {deptName} • {tenderNum}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "0 0 2px", fontWeight: 700, textTransform: "uppercase" }}>Start Date</p>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "0 0 2px", fontWeight: 700, textTransform: "uppercase" }}>End Date</p>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} color="#fbbf24" />
                      Remaining: <strong style={{ color: remainingDays <= 30 ? "#ef4444" : "#fbbf24" }}>{remainingDays} Days</strong>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Star size={14} color="#fbbf24" /> 4.8 Performance
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
