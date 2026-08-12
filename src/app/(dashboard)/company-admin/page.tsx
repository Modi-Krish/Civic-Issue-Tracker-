'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, Building, Star, CheckCircle, TrendingUp, ArrowRight, ShieldCheck, FileSignature, DollarSign, Calendar, Clock, X, UserPlus, Users, Lock, Edit3, Eye, CheckCircle2, UserCheck, AlertTriangle, AlertCircle, Award, ExternalLink } from 'lucide-react';
import type { Tender, TenderBid } from '@/lib/types/database';
import Link from 'next/link';

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

export default function CompanyAdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [stats, setStats] = useState({ rating: 4.8, completed: 0, activeContracts: 0, openBids: 0 });
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [myBidsMap, setMyBidsMap] = useState<Record<string, TenderBid>>({});
  const [myContractsList, setMyContractsList] = useState<any[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [bidForm, setBidForm] = useState({ amount: '', days: '30', techDoc: '', finDoc: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Tabs: WORK_ORDERS | TENDERS | AWARDED | EMPLOYEES
  const [activeTab, setActiveTab] = useState<'WORK_ORDERS' | 'TENDERS' | 'AWARDED' | 'EMPLOYEES'>('WORK_ORDERS');
  const [employees, setEmployees] = useState<any[]>([]);
  const [companyIssues, setCompanyIssues] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [empForm, setEmpForm] = useState({ id: '', fullName: '', email: '', phone: '', designation: 'Field Engineer', status: 'ACTIVE' });
  const [empSubmitting, setEmpSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
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

        // 1. Check company_employees mapping
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

        // 2. Fetch Published & Awarded Tenders
        const { data: tenderData } = await supabase
          .from('tenders')
          .select('*')
          .in('status', ['Published', 'OPEN', 'Awarded', 'Active'])
          .order('created_at', { ascending: false });

        if (tenderData) setTenders(tenderData as Tender[]);

        // 3. Fetch Bids across company candidate IDs or all bids
        const { data: bidsData } = await supabase
          .from('tender_bids')
          .select('*');

        const myBids: TenderBid[] = [];
        const map: Record<string, TenderBid> = {};

        if (bidsData) {
          bidsData.forEach((b: any) => {
            if (idList.includes(b.company_id) || b.company_id === cid || b.company_id === userId) {
              myBids.push(b);
              map[b.tender_id] = b;
            }
          });
          setMyBidsMap(map);
        }

        // 4. Fetch Contracts for Company via Server API (bypasses RLS)
        const resContracts = await fetch(`/api/company/contracts?company_id=${cid}`);
        const contractsJson = await resContracts.json();
        const activeDeptIds = new Set<string>();

        if (contractsJson.contracts) {
          setMyContractsList(contractsJson.contracts);
          setStats(prev => ({ ...prev, activeContracts: contractsJson.contracts.length, openBids: myBids.length }));

          contractsJson.contracts.forEach((c: any) => {
            if (c.department_id) activeDeptIds.add(c.department_id);
            if (c.departments?.slug) activeDeptIds.add(c.departments.slug);
            if (c.departments?.name) activeDeptIds.add(c.departments.name.toLowerCase());
          });
        }

        // 5. Fetch Employees
        const resEmp = await fetch(`/api/company/employees?company_id=${cid}`);
        const empJson = await resEmp.json();
        if (empJson.employees) setEmployees(empJson.employees);

        // 6. Realtime fetch company issues from Firestore (all work orders matching company_id OR active contract departments)
        const { collection, query, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const issuesQ = query(collection(db, 'issues'));
        onSnapshot(issuesQ, (snapshot) => {
          const issuesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          // Filter for active work orders matching company_id or active contract departments
          const filteredIssues = issuesData.filter((issue: any) => {
            if (issue.status === 'CLOSED') return false;

            const issueDept = String(issue.department_id || '').toLowerCase();
            const issueCompany = String(issue.company_id || '');

            // 1. Direct company assignment match
            if (issueCompany && idList.includes(issueCompany)) return true;

            // 2. Department match for active company contracts
            if (activeDeptIds.size > 0) {
              const matchesDept = Array.from(activeDeptIds).some(id => {
                const cleanId = String(id).toLowerCase();
                return cleanId && (issueDept === cleanId || issueDept.includes(cleanId) || cleanId.includes(issueDept));
              });
              if (matchesDept) return true;
            }

            return false;
          });

          setCompanyIssues(filteredIssues);
        });

      } catch (err) {
        console.error("Error loading company dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, authLoading]);

  const handleOpenBidModal = (t: Tender) => {
    const existingBid = myBidsMap[t.id];
    setSelectedTender(t);
    if (existingBid) {
      setBidForm({
        amount: String(existingBid.bid_amount || ''),
        days: String(existingBid.estimated_completion_days || '30'),
        techDoc: existingBid.technical_proposal_url || '',
        finDoc: existingBid.financial_proposal_url || ''
      });
    } else {
      setBidForm({
        amount: String(t.estimated_budget || ''),
        days: '30',
        techDoc: '',
        finDoc: ''
      });
    }
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTender || !companyId || !user) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/tenders/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId: selectedTender.id,
          companyId: companyId,
          userId: user.id || user.uid,
          bidAmount: bidForm.amount,
          completionDays: bidForm.days,
          technicalProposalUrl: bidForm.techDoc,
          financialProposalUrl: bidForm.finDoc
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to submit bid");

      setToast(data.message || `Bid action successfully completed for "${selectedTender.title}"!`);

      if (data.bid) {
        setMyBidsMap(prev => ({ ...prev, [selectedTender.id]: data.bid }));
      }

      setSelectedTender(null);
      setBidForm({ amount: '', days: '30', techDoc: '', finDoc: '' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to submit bid.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setEmpSubmitting(true);
    let generatedPass = '';
    try {
      if (empForm.id) {
        const res = await fetch('/api/company/employees', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: empForm.id,
            designation: empForm.designation,
            availability: empForm.status,
            fullName: empForm.fullName
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to update employee');
      } else {
        const res = await fetch('/api/company/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            fullName: empForm.fullName,
            email: empForm.email,
            phone: empForm.phone,
            designation: empForm.designation
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to create employee');
        
        if (data.password) {
          generatedPass = data.password;
        }
      }

      const resEmp = await fetch(`/api/company/employees?company_id=${companyId}`);
      const empJson = await resEmp.json();
      if (empJson.employees) setEmployees(empJson.employees);

      setShowEmployeeModal(false);
      setEmpForm({ id: '', fullName: '', email: '', phone: '', designation: 'Field Engineer', status: 'ACTIVE' });
      
      if (generatedPass) {
        setToast(`Employee created! Temporary Password: ${generatedPass}`);
        setTimeout(() => setToast(null), 15000); // give 15s to copy
      } else {
        setToast("Employee updated successfully!");
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || "Operation failed.");
    } finally {
      setEmpSubmitting(false);
    }
  };

  const toggleEmployeeStatus = async (emp: any) => {
    const newStatus = emp.availability === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await fetch('/api/company/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id,
          availability: newStatus
        })
      });
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, availability: newStatus } : e));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignEmployeeToIssue = async (issueId: string) => {
    const empProfileId = selectedEmployees[issueId];
    if (!empProfileId) return alert("Please select an employee first");

    setActionLoading(issueId);
    try {
      const { doc, updateDoc, serverTimestamp, addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { sendSystemNotification } = await import('@/lib/client-actions/notifications');

      const empObj = employees.find(e => e.profile_id === empProfileId || e.id === empProfileId);
      const empName = empObj?.full_name || empObj?.profiles?.full_name || empObj?.email || 'Field Engineer';

      await updateDoc(doc(db, 'issues', issueId), {
        status: 'COMPANY_EMPLOYEE_ASSIGNED',
        assigned_employee_id: empProfileId,
        assigned_employee_name: empName,
        updated_at: serverTimestamp()
      });

      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: issueId,
        to_status: 'COMPANY_EMPLOYEE_ASSIGNED',
        changed_by: user?.id || user?.uid || 'COMPANY_ADMIN',
        comment: `Assigned work order to corporate employee ${empName}`,
        created_at: serverTimestamp()
      });

      await sendSystemNotification({
        userId: empProfileId,
        title: 'New Work Order Assigned',
        body: `You have been assigned to resolve a civic issue by your company admin.`,
        type: 'status_updated',
        issueId
      });

      setToast(`Work order assigned to ${empName} successfully!`);
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert("Failed to assign employee: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWorkOrder = async (issueId: string) => {
    setActionLoading(issueId);
    try {
      const { doc, updateDoc, serverTimestamp, addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { sendSystemNotification } = await import('@/lib/client-actions/notifications');

      await updateDoc(doc(db, 'issues', issueId), {
        status: 'COMMUNITY_REVIEW',
        updated_at: serverTimestamp()
      });

      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: issueId,
        to_status: 'COMMUNITY_REVIEW',
        changed_by: user?.id || user?.uid || 'COMPANY_ADMIN',
        comment: 'Company Admin reviewed and approved completion proof. Sent for Citizen Rating.',
        created_at: serverTimestamp()
      });

      const issueObj = companyIssues.find(i => i.id === issueId);
      if (issueObj?.reporter_id) {
        await sendSystemNotification({
          userId: issueObj.reporter_id,
          title: 'Work Completed - Please Rate Repair',
          body: `Contractor has completed repair on "${issueObj.title}". Please rate the work!`,
          type: 'status_updated',
          issueId
        });
      }

      setToast("Work approved! Sent to Citizen for review and rating.");
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert("Failed to approve work: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWorkOrder = async (issueId: string) => {
    setActionLoading(issueId);
    try {
      const { doc, updateDoc, serverTimestamp, addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      await updateDoc(doc(db, 'issues', issueId), {
        status: 'REJECTED',
        updated_at: serverTimestamp()
      });

      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: issueId,
        to_status: 'REJECTED',
        changed_by: user?.id || user?.uid || 'COMPANY_ADMIN',
        comment: 'Work rejected by Company Admin - sent back for rework.',
        created_at: serverTimestamp()
      });

      setToast("Work rejected and marked for rework.");
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert("Failed to reject work: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "spin 0.8s linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100dvh", background: T.base, fontFamily: "'Inter', sans-serif",
    color: T.text1,
    padding: "0 0 calc(90px + env(safe-area-inset-bottom, 0px))",
    maxWidth: "100%", margin: "0 auto"
  };

  const statCardStyle = {
    padding: "18px 16px", borderRadius: 22,
    background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised,
    display: "flex", alignItems: "center", gap: 16
  };

  return (
    <div style={pageStyle}>
      <style>{`
        .ca-inner { padding: 20px 16px 0; }
        @media (min-width: 768px) { .ca-inner { max-width: 1300px; margin: 0 auto; padding: 32px 32px 0; } }
        .ca-header { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
        @media (min-width: 640px) { .ca-header { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
        .ca-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
        @media (min-width: 768px) { .ca-stat-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
      `}</style>
      <div className="ca-inner">
      {/* Header */}
      <div className="ca-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px", color: T.text1, lineHeight: 1.15 }}>Company Operations</h1>
          <p style={{ color: T.text3, margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>Manage government tender bids, awarded contracts, and field personnel.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/company-admin/contracts" style={{ padding: "10px 16px", borderRadius: 13, background: T.raised, border: `1px solid ${T.border}`, color: T.accentDark, fontSize: 12, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: SH.raisedSm, whiteSpace: "nowrap" }}>
            <ShieldCheck size={15} /> My Contracts ({myContractsList.length})
          </Link>
        </div>
      </div>

      {toast && (
        <div style={{ padding: 16, borderRadius: 16, background: "#EAF3DE", border: "1px solid #27500A30", color: "#27500A", fontWeight: 800, fontSize: 14, marginBottom: 24, boxShadow: SH.insetSoft }}>
          {toast}
        </div>
      )}

      {/* Stats row */}
      <div className="ca-stat-grid">
        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FAEEDA", display: "flex", alignItems: "center", justifyContent: "center", color: "#854F0B", boxShadow: SH.insetSoft }}>
            <Star size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Company Rating</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{stats.rating}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", color: "#27500A", boxShadow: SH.insetSoft }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Active Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{myContractsList.length}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", color: "#0C447C", boxShadow: SH.insetSoft }}>
            <Briefcase size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Open Tenders</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{tenders.filter(t => t.status === 'Published' || (t.status as string) === 'OPEN').length}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", color: "#3C3489", boxShadow: SH.insetSoft }}>
            <Award size={24} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Awarded Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>{myContractsList.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, overflowX: "auto" }}>
        {[
          { key: 'WORK_ORDERS', label: `🚨 Work Orders (${companyIssues.length})` },
          { key: 'TENDERS', label: `🏛️ Open Tenders` },
          { key: 'AWARDED', label: `🏆 Awarded (${myContractsList.length})` },
          { key: 'EMPLOYEES', label: `👷 Employees (${employees.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "10px 20px", borderRadius: 14,
              background: activeTab === tab.key ? T.raised : 'transparent',
              color: activeTab === tab.key ? T.accentDark : T.text3,
              fontSize: 13, fontWeight: 800, border: activeTab === tab.key ? `1px solid ${T.border}` : "1px solid transparent",
              boxShadow: activeTab === tab.key ? SH.raisedSm : 'none',
              cursor: "pointer", whiteSpace: "nowrap"
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 0: Work Orders & Issues */}
      {activeTab === 'WORK_ORDERS' && (
        <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, boxShadow: SH.raised }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>Company Work Orders & Issues</h2>
              <p style={{ fontSize: 13, color: T.text3, margin: "4px 0 0", fontWeight: 600 }}>Manage civic issues routed under your company contracts. Assign field engineers and review completed work.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {companyIssues.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: T.base, borderRadius: 20, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
                <AlertCircle size={36} color={T.text3} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: T.text3, margin: 0, fontWeight: 600 }}>No work orders routed to your company yet.</p>
              </div>
            ) : (
              companyIssues.map(issue => {
                const isUnassigned = issue.status === 'COMPANY_ASSIGNED' || issue.status === 'REJECTED';
                const isPendingApproval = issue.status === 'SUBMITTED_FOR_APPROVAL';
                const isAssigned = issue.status === 'COMPANY_EMPLOYEE_ASSIGNED' || issue.status === 'IN_PROGRESS' || issue.status === 'TRAVELLING';

                const resolveImg = (imgObj: any, path: string | null | undefined) => {
                  if (imgObj?.url) return imgObj.url;
                  if (!path) return null;
                  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
                  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oyeogxnvdckmazhwiksm.supabase.co';
                  return `${sUrl}/storage/v1/object/public/issue-images/${path}`;
                };

                const beforeUrl = resolveImg(issue.image, issue.before_image_path);
                const afterUrl = resolveImg(issue.after_image, issue.after_image_path);

                return (
                  <div key={issue.id} style={{ padding: 24, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 16, boxShadow: SH.insetSoft }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 99, background: "#EEEDFE", color: "#3C3489", boxShadow: SH.raisedSm }}>
                            {issue.issue_type || "Civic Issue"}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 99, background: T.raised, border: `1px solid ${T.border}`, color: T.text2, boxShadow: SH.raisedSm }}>
                            Status: {issue.status}
                          </span>
                          {issue.rating && (
                            <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 99, background: issue.rating < 2.5 ? "#FCEBEB" : "#EAF3DE", color: issue.rating < 2.5 ? "#791F1F" : "#27500A", boxShadow: SH.raisedSm }}>
                              Rating: {issue.rating}/5 ⭐
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px", color: T.text1 }}>{issue.title}</h3>
                        <p style={{ fontSize: 13, color: T.text2, margin: 0, fontWeight: 500 }}>{issue.description}</p>
                      </div>

                      <Link href={`/issue?id=${issue.id}`} style={{ padding: "10px 16px", borderRadius: 12, background: T.raised, border: `1px solid ${T.border}`, color: T.text1, fontSize: 12, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: SH.raisedSm }}>
                        View Details <ExternalLink size={14} />
                      </Link>
                    </div>

                    {/* Photos if available */}
                    <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
                      {beforeUrl && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, marginBottom: 6 }}>BEFORE PHOTO</div>
                          <img src={beforeUrl} alt="Before" style={{ width: 120, height: 90, borderRadius: 14, objectFit: "cover", border: `1px solid ${T.border}`, boxShadow: SH.raisedSm }} />
                        </div>
                      )}
                      {afterUrl && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "#27500A", marginBottom: 6 }}>RESOLUTION PROOF</div>
                          <img src={afterUrl} alt="After" style={{ width: 120, height: 90, borderRadius: 14, objectFit: "cover", border: "2px solid #EAF3DE", boxShadow: SH.raisedSm }} />
                        </div>
                      )}
                    </div>

                    {/* ACTION PANEL */}
                    <div style={{ paddingTop: 16, borderTop: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                      {isUnassigned && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 500 }}>
                          <select
                            value={selectedEmployees[issue.id] || ''}
                            onChange={(e) => setSelectedEmployees(prev => ({ ...prev, [issue.id]: e.target.value }))}
                            style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: T.raised, border: `1px solid ${T.border}`, color: T.text1, fontSize: 13, fontWeight: 600, boxShadow: SH.insetSoft, outline: 'none' }}>
                            <option value="">-- Select Field Engineer / Employee --</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.profile_id || emp.profileId || emp.id}>
                                {emp.full_name || emp.profiles?.full_name || emp.email} ({emp.designation || 'Engineer'})
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleAssignEmployeeToIssue(issue.id)}
                            disabled={actionLoading === issue.id}
                            style={{ padding: "12px 20px", borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 12, fontWeight: 900, border: "none", cursor: "pointer", whiteSpace: "nowrap", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                            {actionLoading === issue.id ? "Assigning..." : "Assign Employee"}
                          </button>
                        </div>
                      )}

                      {isAssigned && (
                        <div style={{ fontSize: 13, color: "#3C3489", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, background: "#EEEDFE", padding: "8px 16px", borderRadius: 12, boxShadow: SH.raisedSm }}>
                          <UserCheck size={16} /> Assigned Engineer: {issue.assigned_employee_name || 'Corporate Employee'}
                        </div>
                      )}

                      {isPendingApproval && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button
                            onClick={() => handleApproveWorkOrder(issue.id)}
                            disabled={actionLoading === issue.id}
                            style={{ padding: "12px 20px", borderRadius: 12, background: "#E1F5EE", border: "1px solid #08504130", color: "#085041", fontSize: 12, fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: SH.raisedSm }}>
                            <CheckCircle2 size={16} /> Approve & Send for Citizen Review
                          </button>

                          <button
                            onClick={() => handleRejectWorkOrder(issue.id)}
                            disabled={actionLoading === issue.id}
                            style={{ padding: "12px 20px", borderRadius: 12, background: "#FCEBEB", border: "1px solid #791F1F30", color: "#791F1F", fontSize: 12, fontWeight: 900, cursor: "pointer", boxShadow: SH.raisedSm }}>
                            Reject (Rework)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Open Tenders */}
      {activeTab === 'TENDERS' && (
        <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, boxShadow: SH.raised }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>Open Government Tenders</h2>
              <p style={{ fontSize: 13, color: T.text3, margin: "4px 0 0", fontWeight: 600 }}>Active tender notices. Each company may submit exactly ONE bid per tender.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tenders.filter(t => t.status === 'Published' || (t.status as string) === 'OPEN').length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: T.base, borderRadius: 20, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
                <p style={{ fontSize: 14, color: T.text3, margin: 0, fontWeight: 600 }}>No open published tenders available at the moment.</p>
              </div>
            ) : (
              tenders.filter(t => t.status === 'Published' || (t.status as string) === 'OPEN').map(t => {
                const existingBid = myBidsMap[t.id];
                const isDeadlinePassed = t.bid_submission_deadline ? new Date() > new Date(t.bid_submission_deadline) : false;

                return (
                  <div key={t.id} style={{ padding: 24, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: SH.insetSoft }}>
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#0C447C", background: "#E6F1FB", padding: "4px 10px", borderRadius: 99, boxShadow: SH.raisedSm }}>{t.tender_number}</span>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#3C3489", background: "#EEEDFE", padding: "4px 10px", borderRadius: 99, boxShadow: SH.raisedSm }}>{t.tender_type}</span>
                        {existingBid && (
                          <span style={{ fontSize: 10, fontWeight: 900, color: "#27500A", background: "#EAF3DE", padding: "4px 10px", borderRadius: 99, boxShadow: SH.raisedSm }}>
                            ✓ Bid Submitted (${existingBid.bid_amount?.toLocaleString()})
                          </span>
                        )}
                        {isDeadlinePassed && (
                          <span style={{ fontSize: 10, fontWeight: 900, color: "#791F1F", background: "#FCEBEB", padding: "4px 10px", borderRadius: 99, boxShadow: SH.raisedSm }}>
                            🔒 Deadline Passed
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px", color: T.text1 }}>{t.title}</h4>
                      <p style={{ fontSize: 13, color: T.text2, margin: "0 0 16px", fontWeight: 500 }}>{t.description}</p>
                      <div style={{ display: "flex", gap: 24, fontSize: 12, color: T.text3, fontWeight: 700 }}>
                        <span>Est. Budget: <strong style={{ color: "#085041" }}>${t.estimated_budget?.toLocaleString()}</strong></span>
                        <span>EMD: <strong style={{ color: T.text1 }}>${t.emd_amount?.toLocaleString()}</strong></span>
                        <span>Deadline: <strong style={{ color: isDeadlinePassed ? "#791F1F" : "#854F0B" }}>{t.bid_submission_deadline ? new Date(t.bid_submission_deadline).toLocaleDateString() : 'N/A'}</strong></span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenBidModal(t)}
                      style={{
                        padding: "14px 24px", borderRadius: 14,
                        background: isDeadlinePassed
                          ? T.raised
                          : existingBid
                          ? "#E1F5EE"
                          : `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                        color: isDeadlinePassed ? T.text3 : existingBid ? "#085041" : "white",
                        fontSize: 12, fontWeight: 900, border: isDeadlinePassed || existingBid ? `1px solid ${isDeadlinePassed ? T.border : '#08504130'}` : "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em",
                        display: "inline-flex", alignItems: "center", gap: 8,
                        boxShadow: isDeadlinePassed ? SH.insetSoft : SH.raisedSm
                      }}>
                      {isDeadlinePassed ? <Lock size={16} /> : existingBid ? <Edit3 size={16} /> : null}
                      {isDeadlinePassed ? "View Bid" : existingBid ? "Edit Bid" : "Submit Bid"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Awarded Tenders & Contracts */}
      {activeTab === 'AWARDED' && (
        <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, boxShadow: SH.raised }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>Awarded Tenders & Active Contracts</h2>
              <p style={{ fontSize: 13, color: T.text3, margin: "4px 0 0", fontWeight: 600 }}>Government contracts won by your company.</p>
            </div>
            <Link href="/company-admin/contracts" style={{ padding: "12px 20px", borderRadius: 14, background: "#E1F5EE", border: "1px solid #08504130", color: "#085041", fontSize: 13, fontWeight: 900, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: SH.raisedSm }}>
              View Contracts Page <ExternalLink size={16} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {myContractsList.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: T.base, borderRadius: 20, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
                <Award size={48} color={T.text3} style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px", color: T.text1 }}>No awarded contracts yet</h3>
                <p style={{ fontSize: 14, color: T.text3, margin: 0, fontWeight: 500 }}>Submit bids on open tenders to win government contracts.</p>
              </div>
            ) : (
              myContractsList.map(c => {
                const deptName = c.departments?.name || 'Department Division';
                const tenderTitle = c.tenders?.title || 'Civic Infrastructure Contract';
                const tenderNum = c.tenders?.tender_number || `CNT-${c.id.slice(0, 8)}`;

                return (
                  <div key={c.id} style={{ padding: 24, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: SH.insetSoft }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 99, background: "#EAF3DE", color: "#27500A", textTransform: "uppercase", boxShadow: SH.raisedSm }}>
                          🏆 Contract Won ({c.status || 'Active'})
                        </span>
                        <span style={{ fontSize: 11, color: T.text3, fontWeight: 800 }}>
                          {tenderNum}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", color: T.text1, letterSpacing: '-0.02em' }}>{tenderTitle}</h3>
                      <p style={{ fontSize: 14, color: T.accentDark, margin: "0 0 16px", fontWeight: 800 }}>{deptName}</p>
                      
                      <div style={{ display: "flex", gap: 24, fontSize: 12, color: T.text3, fontWeight: 700 }}>
                        <span>Start: <strong style={{ color: T.text1 }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'}</strong></span>
                        <span>End: <strong style={{ color: T.text1 }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : 'N/A'}</strong></span>
                        <span>SLA: <strong style={{ color: "#854F0B" }}>{c.sla_tier || 'Standard'}</strong></span>
                      </div>
                    </div>

                    <Link href="/company-admin/contracts" style={{ padding: "14px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 13, fontWeight: 900, textDecoration: "none", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                      Manage Contract
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Employee Management */}
      {activeTab === 'EMPLOYEES' && (
        <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, boxShadow: SH.raised }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>Company Personnel & Field Engineers</h2>
              <p style={{ fontSize: 13, color: T.text3, margin: "4px 0 0", fontWeight: 600 }}>Manage employees belonging to your company.</p>
            </div>
            <button
              onClick={() => {
                setEmpForm({ id: '', fullName: '', email: '', phone: '', designation: 'Field Engineer', status: 'ACTIVE' });
                setShowEmployeeModal(true);
              }}
              style={{ padding: "12px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 13, fontWeight: 900, border: "none", cursor: "pointer", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
              <UserPlus size={16} /> Add Employee
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {employees.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: T.base, borderRadius: 20, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
                <Users size={48} color={T.text3} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: T.text3, margin: 0, fontWeight: 600 }}>No company employees added yet. Click "Add Employee" above.</p>
              </div>
            ) : (
              employees.map(emp => (
                <div key={emp.id} style={{ padding: 20, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: SH.insetSoft }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: T.text1 }}>{emp.profiles?.full_name || emp.full_name || 'Company Employee'}</h4>
                      <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 99, background: emp.availability === 'ACTIVE' ? "#EAF3DE" : "#FCEBEB", color: emp.availability === 'ACTIVE' ? "#27500A" : "#791F1F", boxShadow: SH.raisedSm }}>
                        {emp.availability || 'ACTIVE'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: T.text2, margin: 0, fontWeight: 600 }}>
                      Designation: <strong style={{ color: T.text1 }}>{emp.designation || 'Field Engineer'}</strong> • ID: <span style={{ fontFamily: "monospace" }}>{emp.id.slice(0, 8)}</span>
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => toggleEmployeeStatus(emp)}
                      style={{ padding: "10px 16px", borderRadius: 12, background: T.raised, border: `1px solid ${T.border}`, color: emp.availability === 'ACTIVE' ? "#791F1F" : "#085041", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: SH.raisedSm }}>
                      {emp.availability === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        setEmpForm({
                          id: emp.id,
                          fullName: emp.profiles?.full_name || emp.full_name || '',
                          email: emp.email || '',
                          phone: emp.phone || '',
                          designation: emp.designation || 'Field Engineer',
                          status: emp.availability || 'ACTIVE'
                        });
                        setShowEmployeeModal(true);
                      }}
                      style={{ padding: "10px 16px", borderRadius: 12, background: "#E6F1FB", border: "1px solid #0C447C30", color: "#0C447C", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: SH.raisedSm }}>
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Bid Submission / Edit */}
      {selectedTender && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,44,42,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 28, width: "100%", maxWidth: 540, padding: 32, boxShadow: SH.raised }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>
                  {myBidsMap[selectedTender.id] ? "Edit Submitted Bid" : "Submit Contractor Bid"}
                </h3>
                <p style={{ fontSize: 13, color: T.text3, margin: "4px 0 0", fontWeight: 600 }}>{selectedTender.title} ({selectedTender.tender_number})</p>
              </div>
              <button onClick={() => setSelectedTender(null)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", padding: 4 }}>
                <X size={24} />
              </button>
            </div>

            {selectedTender.bid_submission_deadline && new Date() > new Date(selectedTender.bid_submission_deadline) ? (
              <div style={{ padding: 24, borderRadius: 16, background: "#FCEBEB", border: "1px solid #791F1F30", color: "#791F1F", fontSize: 14, fontWeight: 800, boxShadow: SH.insetSoft }}>
                🔒 The bid submission deadline for this tender has passed. This bid is now read-only.
                {myBidsMap[selectedTender.id] && (
                  <div style={{ marginTop: 16, color: T.text1, fontSize: 13, fontWeight: 700, padding: 16, background: T.raised, borderRadius: 12, border: `1px solid ${T.border}` }}>
                    Your Quoted Price: <strong style={{ fontSize: 15, color: "#085041" }}>${myBidsMap[selectedTender.id].bid_amount?.toLocaleString()}</strong><br />
                    Est. Days: <strong style={{ fontSize: 15 }}>{myBidsMap[selectedTender.id].estimated_completion_days} Days</strong>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleBidSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>Your Proposed Bid Amount ($)</label>
                  <input 
                    required
                    type="number"
                    value={bidForm.amount}
                    onChange={(e) => setBidForm({...bidForm, amount: e.target.value})}
                    style={{ width: "100%", background: T.base, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 15, outline: "none", fontWeight: 600, boxShadow: SH.insetSoft }}
                    placeholder="e.g. 450000"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>Est. Completion Time (Days)</label>
                  <input 
                    required
                    type="number"
                    value={bidForm.days}
                    onChange={(e) => setBidForm({...bidForm, days: e.target.value})}
                    style={{ width: "100%", background: T.base, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 15, outline: "none", fontWeight: 600, boxShadow: SH.insetSoft }}
                    placeholder="e.g. 30"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>Technical Proposal URL (Optional)</label>
                  <input 
                    type="url"
                    value={bidForm.techDoc}
                    onChange={(e) => setBidForm({...bidForm, techDoc: e.target.value})}
                    style={{ width: "100%", background: T.base, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 15, outline: "none", fontWeight: 600, boxShadow: SH.insetSoft }}
                    placeholder="https://..."
                  />
                </div>

                <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                  <button type="button" onClick={() => setSelectedTender(null)} style={{ flex: 1, padding: 14, borderRadius: 14, background: T.base, border: `1px solid ${T.border}`, color: T.text1, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: SH.raisedSm }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ flex: 2, padding: 14, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 13, fontWeight: 900, border: "none", cursor: "pointer", textTransform: "uppercase", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                    {submitting ? 'Processing...' : myBidsMap[selectedTender.id] ? 'Update Bid' : 'Confirm Bid Submission'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Modal: Employee Create / Edit */}
      {showEmployeeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,44,42,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 28, width: "100%", maxWidth: 500, padding: 32, boxShadow: SH.raised }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>
                {empForm.id ? "Edit Employee" : "Create Company Employee"}
              </h3>
              <button onClick={() => setShowEmployeeModal(false)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", padding: 4 }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEmployeeSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>Full Name</label>
                <input required type="text" value={empForm.fullName} onChange={(e) => setEmpForm({...empForm, fullName: e.target.value})} style={{ width: "100%", background: T.base, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 15, outline: 'none', fontWeight: 600, boxShadow: SH.insetSoft }} placeholder="John Doe" />
              </div>

              {!empForm.id && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>Email</label>
                  <input required type="email" value={empForm.email} onChange={(e) => setEmpForm({...empForm, email: e.target.value})} style={{ width: "100%", background: T.base, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 15, outline: 'none', fontWeight: 600, boxShadow: SH.insetSoft }} placeholder="john@company.com" />
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>Designation</label>
                <input required type="text" value={empForm.designation} onChange={(e) => setEmpForm({...empForm, designation: e.target.value})} style={{ width: "100%", background: T.base, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 15, outline: 'none', fontWeight: 600, boxShadow: SH.insetSoft }} placeholder="Senior Field Engineer" />
              </div>

              <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                <button type="button" onClick={() => setShowEmployeeModal(false)} style={{ flex: 1, padding: 14, borderRadius: 14, background: T.base, border: `1px solid ${T.border}`, color: T.text1, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: SH.raisedSm }}>Cancel</button>
                <button type="submit" disabled={empSubmitting} style={{ flex: 2, padding: 14, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 13, fontWeight: 900, border: "none", cursor: "pointer", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                  {empSubmitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

