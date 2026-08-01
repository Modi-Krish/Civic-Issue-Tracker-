'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, Building, Star, CheckCircle, TrendingUp, ArrowRight, ShieldCheck, FileSignature, DollarSign, Calendar, Clock, X, UserPlus, Users, Lock, Edit3, Eye, CheckCircle2, UserCheck, AlertTriangle, AlertCircle, Award, ExternalLink } from 'lucide-react';
import type { Tender, TenderBid } from '@/lib/types/database';
import Link from 'next/link';

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

        // 6. Realtime fetch company issues from Firestore (unsolved & active contract departments only)
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        if (idList.length > 0) {
          const issuesQ = query(
            collection(db, 'issues'),
            where('company_id', 'in', idList.slice(0, 10))
          );
          onSnapshot(issuesQ, (snapshot) => {
            const issuesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter for unsolved issues from active contract departments
            const filteredIssues = issuesData.filter((issue: any) => {
              // 1. Unsolved issues only
              if (issue.status === 'CLOSED') return false;

              // 2. Department match if contract departments exist
              if (activeDeptIds.size > 0) {
                const deptId = (issue.department_id || '').toLowerCase();
                const matchesDept = activeDeptIds.has(issue.department_id) || 
                                    activeDeptIds.has(deptId) ||
                                    Array.from(activeDeptIds).some(id => deptId.includes(id));
                return matchesDept;
              }

              return true;
            });

            setCompanyIssues(filteredIssues);
          });
        }

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
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#0ea5e9", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>Company Operations</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>Manage government tender bids, awarded contracts, and field personnel.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/company-admin/contracts" style={{ padding: "12px 20px", borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontSize: 13, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={16} /> My Contracts ({myContractsList.length})
          </Link>
        </div>
      </div>

      {toast && (
        <div style={{ padding: 16, borderRadius: 16, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontWeight: 700, fontSize: 14, marginBottom: 24 }}>
          {toast}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(251, 191, 36, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
            <Star size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Company Rating</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{stats.rating}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Active Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{myContractsList.length}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(14, 165, 233, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9" }}>
            <Briefcase size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Open Tenders</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{tenders.filter(t => t.status === 'Published' || (t.status as string) === 'OPEN').length}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(167, 139, 250, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa" }}>
            <Award size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Awarded Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{myContractsList.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16, overflowX: "auto" }}>
        <button
          onClick={() => setActiveTab('WORK_ORDERS')}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: activeTab === 'WORK_ORDERS' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
            color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", whiteSpace: "nowrap"
          }}>
          🚨 Work Orders / Issues ({companyIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('TENDERS')}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: activeTab === 'TENDERS' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
            color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", whiteSpace: "nowrap"
          }}>
          🏛️ Open Tenders
        </button>
        <button
          onClick={() => setActiveTab('AWARDED')}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: activeTab === 'AWARDED' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
            color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer"
          }}>
          🏆 Awarded Tenders & Contracts ({myContractsList.length})
        </button>
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: activeTab === 'EMPLOYEES' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
            color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer"
          }}>
          👷 Employee Management ({employees.length})
        </button>
      </div>

      {/* TAB 0: Work Orders & Issues */}
      {activeTab === 'WORK_ORDERS' && (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Company Work Orders & Issues</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>Manage civic issues routed under your company contracts. Assign field engineers and review completed work.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {companyIssues.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.08)" }}>
                <AlertCircle size={36} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>No work orders routed to your company yet.</p>
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
                  <div key={issue.id} style={{ padding: 24, borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9" }}>
                            {issue.issue_type || "Civic Issue"}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                            Status: {issue.status}
                          </span>
                          {issue.rating && (
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: issue.rating < 2.5 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", color: issue.rating < 2.5 ? "#ef4444" : "#10b981" }}>
                              Rating: {issue.rating}/5 ⭐
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{issue.title}</h3>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>{issue.description}</p>
                      </div>

                      <Link href={`/issue?id=${issue.id}`} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        View Details <ExternalLink size={14} />
                      </Link>
                    </div>

                    {/* Photos if available */}
                    <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
                      {beforeUrl && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>BEFORE PHOTO</div>
                          <img src={beforeUrl} alt="Before" style={{ width: 120, height: 90, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
                        </div>
                      )}
                      {afterUrl && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>RESOLUTION PROOF</div>
                          <img src={afterUrl} alt="After" style={{ width: 120, height: 90, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(16, 185, 129, 0.3)" }} />
                        </div>
                      )}
                    </div>

                    {/* ACTION PANEL */}
                    <div style={{ paddingTop: 16, borderTop: "1px dashed rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                      {isUnassigned && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 500 }}>
                          <select
                            value={selectedEmployees[issue.id] || ''}
                            onChange={(e) => setSelectedEmployees(prev => ({ ...prev, [issue.id]: e.target.value }))}
                            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: 13 }}>
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
                            style={{ padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                            {actionLoading === issue.id ? "Assigning..." : "Assign Employee"}
                          </button>
                        </div>
                      )}

                      {isAssigned && (
                        <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                          <UserCheck size={16} /> Assigned Engineer: {issue.assigned_employee_name || 'Corporate Employee'}
                        </div>
                      )}

                      {isPendingApproval && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button
                            onClick={() => handleApproveWorkOrder(issue.id)}
                            disabled={actionLoading === issue.id}
                            style={{ padding: "10px 20px", borderRadius: 10, background: "#10b981", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle2 size={16} /> Approve & Send for Citizen Review
                          </button>

                          <button
                            onClick={() => handleRejectWorkOrder(issue.id)}
                            disabled={actionLoading === issue.id}
                            style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
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
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Open Government Tenders</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>Active tender notices. Each company may submit exactly ONE bid per tender.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tenders.filter(t => t.status === 'Published' || (t.status as string) === 'OPEN').length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>No open published tenders available at the moment.</p>
              </div>
            ) : (
              tenders.filter(t => t.status === 'Published' || (t.status as string) === 'OPEN').map(t => {
                const existingBid = myBidsMap[t.id];
                const isDeadlinePassed = t.bid_submission_deadline ? new Date() > new Date(t.bid_submission_deadline) : false;

                return (
                  <div key={t.id} style={{ padding: 24, borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "2px 8px", borderRadius: 99 }}>{t.tender_number}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", background: "rgba(167,139,250,0.1)", padding: "2px 8px", borderRadius: 99 }}>{t.tender_type}</span>
                        {existingBid && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: 99 }}>
                            ✓ Bid Submitted (${existingBid.bid_amount?.toLocaleString()})
                          </span>
                        )}
                        {isDeadlinePassed && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", background: "rgba(239,68,68,0.15)", padding: "2px 8px", borderRadius: 99 }}>
                            🔒 Deadline Passed
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px" }}>{t.title}</h4>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 12px" }}>{t.description}</p>
                      <div style={{ display: "flex", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                        <span>Est. Budget: <strong style={{ color: "#10b981" }}>${t.estimated_budget?.toLocaleString()}</strong></span>
                        <span>EMD: <strong style={{ color: "white" }}>${t.emd_amount?.toLocaleString()}</strong></span>
                        <span>Deadline: <strong style={{ color: isDeadlinePassed ? "#ef4444" : "#fbbf24" }}>{t.bid_submission_deadline ? new Date(t.bid_submission_deadline).toLocaleDateString() : 'N/A'}</strong></span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenBidModal(t)}
                      style={{
                        padding: "12px 20px", borderRadius: 12,
                        background: isDeadlinePassed
                          ? "rgba(255,255,255,0.05)"
                          : existingBid
                          ? "linear-gradient(135deg, #10b981, #059669)"
                          : "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
                        color: isDeadlinePassed ? "rgba(255,255,255,0.4)" : "white",
                        fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em",
                        display: "inline-flex", alignItems: "center", gap: 6
                      }}>
                      {isDeadlinePassed ? <Lock size={14} /> : existingBid ? <Edit3 size={14} /> : null}
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
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Awarded Tenders & Active Contracts</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>Government contracts won by your company.</p>
            </div>
            <Link href="/company-admin/contracts" style={{ padding: "10px 18px", borderRadius: 12, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: 12, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              View Contracts Page <ExternalLink size={14} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {myContractsList.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.08)" }}>
                <Award size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>No awarded contracts yet</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Submit bids on open tenders to win government contracts.</p>
              </div>
            ) : (
              myContractsList.map(c => {
                const deptName = c.departments?.name || 'Department Division';
                const tenderTitle = c.tenders?.title || 'Civic Infrastructure Contract';
                const tenderNum = c.tenders?.tender_number || `CNT-${c.id.slice(0, 8)}`;

                return (
                  <div key={c.id} style={{ padding: 24, borderRadius: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: "rgba(16,185,129,0.15)", color: "#10b981", textTransform: "uppercase" }}>
                          🏆 Contract Won ({c.status || 'Active'})
                        </span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                          {tenderNum}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{tenderTitle}</h3>
                      <p style={{ fontSize: 13, color: "#0ea5e9", margin: "0 0 12px", fontWeight: 700 }}>{deptName}</p>
                      
                      <div style={{ display: "flex", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                        <span>Start: <strong style={{ color: "white" }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'}</strong></span>
                        <span>End: <strong style={{ color: "white" }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : 'N/A'}</strong></span>
                        <span>SLA: <strong style={{ color: "#fbbf24" }}>{c.sla_tier || 'Standard'}</strong></span>
                      </div>
                    </div>

                    <Link href="/company-admin/contracts" style={{ padding: "12px 20px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
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
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Company Personnel & Field Engineers</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>Manage employees belonging to your company.</p>
            </div>
            <button
              onClick={() => {
                setEmpForm({ id: '', fullName: '', email: '', phone: '', designation: 'Field Engineer', status: 'ACTIVE' });
                setShowEmployeeModal(true);
              }}
              style={{ padding: "12px 20px", borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <UserPlus size={16} /> Add Employee
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {employees.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.08)" }}>
                <Users size={36} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>No company employees added yet. Click "Add Employee" above.</p>
              </div>
            ) : (
              employees.map(emp => (
                <div key={emp.id} style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{emp.profiles?.full_name || emp.full_name || 'Company Employee'}</h4>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: emp.availability === 'ACTIVE' ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", color: emp.availability === 'ACTIVE' ? "#10b981" : "#ef4444" }}>
                        {emp.availability || 'ACTIVE'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                      Designation: <strong style={{ color: "white" }}>{emp.designation || 'Field Engineer'}</strong> • ID: <span style={{ fontFamily: "monospace" }}>{emp.id.slice(0, 8)}</span>
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => toggleEmployeeStatus(emp)}
                      style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: emp.availability === 'ACTIVE' ? "#ef4444" : "#10b981", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
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
                      style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(14, 165, 233, 0.15)", border: "1px solid rgba(14, 165, 233, 0.3)", color: "#0ea5e9", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#121215", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, width: "100%", maxWidth: 540, padding: 28 }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {myBidsMap[selectedTender.id] ? "Edit Submitted Bid" : "Submit Contractor Bid"}
                </h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>{selectedTender.title} ({selectedTender.tender_number})</p>
              </div>
              <button onClick={() => setSelectedTender(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {selectedTender.bid_submission_deadline && new Date() > new Date(selectedTender.bid_submission_deadline) ? (
              <div style={{ padding: 20, borderRadius: 16, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
                🔒 The bid submission deadline for this tender has passed. This bid is now read-only.
                {myBidsMap[selectedTender.id] && (
                  <div style={{ marginTop: 12, color: "white", fontSize: 12 }}>
                    Your Quoted Price: <strong>${myBidsMap[selectedTender.id].bid_amount?.toLocaleString()}</strong><br />
                    Est. Days: <strong>{myBidsMap[selectedTender.id].estimated_completion_days} Days</strong>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleBidSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Your Proposed Bid Amount ($)</label>
                  <input 
                    required
                    type="number"
                    value={bidForm.amount}
                    onChange={(e) => setBidForm({...bidForm, amount: e.target.value})}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "white", fontSize: 14, outline: "none" }}
                    placeholder="e.g. 450000"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Est. Completion Time (Days)</label>
                  <input 
                    required
                    type="number"
                    value={bidForm.days}
                    onChange={(e) => setBidForm({...bidForm, days: e.target.value})}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "white", fontSize: 14, outline: "none" }}
                    placeholder="e.g. 30"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Technical Proposal URL (Optional)</label>
                  <input 
                    type="url"
                    value={bidForm.techDoc}
                    onChange={(e) => setBidForm({...bidForm, techDoc: e.target.value})}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "white", fontSize: 14, outline: "none" }}
                    placeholder="https://..."
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setSelectedTender(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ flex: 2, padding: 14, borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", textTransform: "uppercase" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#121215", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, width: "100%", maxWidth: 500, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {empForm.id ? "Edit Employee" : "Create Company Employee"}
              </h3>
              <button onClick={() => setShowEmployeeModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEmployeeSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Full Name</label>
                <input required type="text" value={empForm.fullName} onChange={(e) => setEmpForm({...empForm, fullName: e.target.value})} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "white", fontSize: 14 }} placeholder="John Doe" />
              </div>

              {!empForm.id && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
                  <input required type="email" value={empForm.email} onChange={(e) => setEmpForm({...empForm, email: e.target.value})} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "white", fontSize: 14 }} placeholder="john@company.com" />
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Designation</label>
                <input required type="text" value={empForm.designation} onChange={(e) => setEmpForm({...empForm, designation: e.target.value})} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "white", fontSize: 14 }} placeholder="Senior Field Engineer" />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowEmployeeModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={empSubmitting} style={{ flex: 2, padding: 12, borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
                  {empSubmitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
