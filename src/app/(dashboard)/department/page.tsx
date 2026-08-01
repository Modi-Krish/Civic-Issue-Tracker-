'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Users, Clock, CheckCircle, AlertTriangle, Building2, ChevronRight, FileText, Star, Activity, XOctagon, MessageSquare, ThumbsUp, ThumbsDown, ShieldCheck, Flame, PieChart } from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import DepartmentActions from '@/components/department/DepartmentActions';
import PublishTenderModal from '@/components/ui/PublishTenderModal';

export default function DepartmentPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [dept, setDept] = useState<any>(null);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tenderStats, setTenderStats] = useState<any>({ activeContracts: 0, pendingTenders: 0 });
  const [activeContractsList, setActiveContractsList] = useState<any[]>([]);
  const [companyRatingsMap, setCompanyRatingsMap] = useState<Record<string, any>>({});
  const [citizenReviews, setCitizenReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTab, setViewTab] = useState<'QUEUE' | 'ANALYTICS' | 'REVIEWS'>('QUEUE');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile?.department_id) {
      setLoading(false);
      return;
    }

    let unsubscribeIssues: (() => void) | null = null;
    let unsubscribeEmployees: (() => void) | null = null;
    let fallbackTimeout: NodeJS.Timeout;

    async function setupRealtime() {
      fallbackTimeout = setTimeout(() => {
        setLoading((prev) => {
          if (prev) {
            setErrorToast("Loading is taking too long. Please try refreshing.");
            return false;
          }
          return prev;
        });
      }, 5000);

      try {
        const { collection, query, where, doc, getDoc, onSnapshot, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        // 1. Department (one-time fetch)
        const deptRef = doc(db, 'departments', profile!.department_id!);
        const deptSnap = await getDoc(deptRef);
        const deptData = deptSnap.exists() ? deptSnap.data() : null;
        setDept(deptData);

        // 2. Issues (real-time)
        const qIssues = query(
          collection(db, 'issues'), 
          where('department_id', '==', profile!.department_id!),
          orderBy('created_at', 'desc')
        );
        unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
          const issuesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setAllIssues(issuesData as Issue[]);
          
          setLoading((prev) => {
            if (prev) {
              clearTimeout(fallbackTimeout);
              return false;
            }
            return prev;
          });
        }, (err) => {
          console.error("Error listening to issues:", err);
          setErrorToast("Lost connection to issue updates.");
        });

        // 3. Department Employees
        const qEmp = query(
          collection(db, 'profiles'), 
          where('department_id', '==', profile!.department_id!), 
          where('role', '==', 'employee')
        );
        unsubscribeEmployees = onSnapshot(qEmp, (snapshot) => {
          const empData = snapshot.docs.map(d => ({ id: d.id, full_name: d.data().full_name }));
          setEmployees(empData);
        });

        // 4. Supabase Tender Stats & Contracts & Company Performance
        try {
          const { count: contractsCount } = await supabase
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', profile!.department_id)
            .in('status', ['Active', 'ACTIVE']);
          
          const { count: tendersCount } = await supabase
            .from('tenders')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', profile!.department_id)
            .in('status', ['Published', 'OPEN']);

          setTenderStats({
            activeContracts: contractsCount || 0,
            pendingTenders: tendersCount || 0,
          });

          // Fetch Active Contracts details
          const { data: activeContracts } = await supabase
            .from('contracts')
            .select('*, tenders(title, tender_number)')
            .eq('department_id', profile!.department_id)
            .in('status', ['Active', 'ACTIVE']);


          if (activeContracts) {
            setActiveContractsList(activeContracts);
            const cids = activeContracts.map(c => c.company_id);
            if (cids.length > 0) {
              const { data: ratings } = await supabase
                .from('company_ratings')
                .select('*')
                .in('company_id', cids);

              if (ratings) {
                const map: Record<string, any> = {};
                ratings.forEach(r => { map[r.company_id] = r; });
                setCompanyRatingsMap(map);
              }
            }
          }

          // Fetch Citizen Reviews
          const { data: reviewsData } = await supabase
            .from('community_reviews')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

          if (reviewsData) setCitizenReviews(reviewsData);

        } catch (err) {
          console.error("Error fetching tender/contract data:", err);
        }

      } catch (err) {
        console.error("Error setting up real-time listeners:", err);
        setErrorToast("An unexpected error occurred while loading data.");
        setLoading(false);
        clearTimeout(fallbackTimeout);
      }
    }

    setupRealtime();

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (unsubscribeIssues) unsubscribeIssues();
      if (unsubscribeEmployees) unsubscribeEmployees();
    };
  }, [user, profile, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!profile?.department_id) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>NO DEPARTMENT ASSIGNED</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>Contact system administrator to link your account.</p>
        </div>
      </div>
    );
  }

  const pendingAssignment = allIssues.filter(i => i.status === 'REPORTED' || i.status === 'DEPARTMENT_ASSIGNED');
  const pendingApproval = allIssues.filter(i => i.status === 'SUBMITTED_FOR_APPROVAL');
  const inProgress = allIssues.filter(i => i.status === 'EMPLOYEE_ASSIGNED' || i.status === 'IN_PROGRESS');
  const communityReview = allIssues.filter(i => i.status === 'COMMUNITY_REVIEW');
  const communityRejected = allIssues.filter(i => i.status === 'COMMUNITY_REJECTED');
  const closedIssues = allIssues.filter(i => i.status === 'CLOSED' || i.status === 'VERIFIED');

  const avgCitizenRating = citizenReviews.length > 0
    ? (citizenReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / citizenReviews.length).toFixed(1)
    : '4.7';

  const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    REPORTED:               { label: "Reported",         color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
    DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.15)" },
    COMPANY_ASSIGNED:       { label: "Contractor Assigned", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
    EMPLOYEE_ASSIGNED:      { label: "Staff Assigned",   color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
    IN_PROGRESS:            { label: "Working",          color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" },
    SUBMITTED_FOR_APPROVAL: { label: "Needs Approval",   color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)" },
    COMMUNITY_REVIEW:       { label: "Community Review", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
    COMMUNITY_REJECTED:     { label: "Rejected (Comm)",  color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
    VERIFIED:               { label: "Verified",         color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
    APPROVED:               { label: "Approved",         color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
    REJECTED:               { label: "Rejected",         color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
    CLOSED:                 { label: "Resolved",         color: "rgba(255, 255, 255, 0.5)", bg: "rgba(255, 255, 255, 0.05)" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 60 }}>
      
      {/* Ambient background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, left: "10%", width: 500, height: 350, background: "radial-gradient(ellipse,rgba(167,139,250,0.05) 0%,transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {errorToast && (
          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", border: "1.5px solid rgba(239, 68, 68, 0.3)", fontSize: 13, color: "#ef4444", fontWeight: 700, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {errorToast}</span>
            <button onClick={() => setErrorToast(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "32px 0 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "4px 12px", borderRadius: 99, background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(167, 139, 250, 0.2)", width: "fit-content" }}>
              <Building2 size={12} color="#a78bfa" />
              <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {dept?.name || 'Department'} Division
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Department Governance</h1>
          </div>

          {dept?.management_mode === 'TENDER' && (
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/department/tenders" style={{ padding: "10px 18px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, fontWeight: 800, textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileText size={14} /> Tenders Portal
              </Link>
              <button onClick={() => setIsModalOpen(true)} style={{ padding: "10px 18px", borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", color: "white", fontSize: 12, fontWeight: 800, textTransform: "uppercase", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileText size={14} /> Publish Tender
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
          {[
            { key: 'QUEUE', label: 'Operational Queue', icon: Activity },
            { key: 'ANALYTICS', label: 'Outsourced Contractor Analytics', icon: PieChart },
            { key: 'REVIEWS', label: 'Citizen Ratings & Feedback', icon: Star },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = viewTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setViewTab(tab.key as any)}
                style={{
                  padding: "10px 20px", borderRadius: 12,
                  background: isSelected ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
                  color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                  fontSize: 12, fontWeight: 800, border: isSelected ? "none" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8
                }}>
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OPERATIONAL QUEUE */}
        {viewTab === 'QUEUE' && (
          <div>
            {/* Quick Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              {[
                { icon: AlertTriangle, label: "To Assign",    value: pendingAssignment.length, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)" },
                { icon: Clock,          label: "In Progress",  value: inProgress.length,        color: "#a78bfa", bg: "rgba(167, 139, 250, 0.08)" },
                { icon: CheckCircle,    label: "To Approve",   value: pendingApproval.length,   color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
                { icon: Users,          label: "Resolved",     value: closedIssues.length,      color: "#10b981", bg: "rgba(16, 185, 129, 0.08)" },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} style={{ borderRadius: 20, padding: "20px 16px", background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.06)`, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "white", lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Incidents Queue */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>ACTIVE INCIDENTS QUEUE</h2>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{allIssues.length} TOTAL</span>
            </div>

            {allIssues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>✔️</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>Clear Queue</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", maxWidth: 280, margin: "0 auto" }}>No pending reports require departmental action.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allIssues.map((issue: Issue) => {
                  const st = STATUS_STYLE[issue.status] || STATUS_STYLE.REPORTED;
                  return (
                    <div key={issue.id} style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", overflow: "hidden", position: "relative" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: st.color }} />
                      
                      <div style={{ padding: "18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/issue?id=${issue.id}`} style={{ fontSize: 15, fontWeight: 800, color: "white", textDecoration: "none", display: "block", marginBottom: 4 }}>
                              {issue.title}
                            </Link>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.25)" }}>ID #{issue.id.slice(0, 8).toUpperCase()}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{issue.issue_type}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 10, background: st.bg, color: st.color, border: `1px solid ${st.color}25`, whiteSpace: "nowrap" }}>
                            {st.label?.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px", border: "1.5px solid rgba(255,255,255,0.05)" }}>
                          <DepartmentActions issue={issue} employees={employees} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OUTSOURCED CONTRACTOR ANALYTICS */}
        {viewTab === 'ANALYTICS' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px", color: "white" }}>Current Active Contractors</h2>

              {activeContractsList.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>No active contracts for this department. Mode is running in fallback department mode.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                  {activeContractsList.map(c => {
                    const ratingData = companyRatingsMap[c.company_id] || { technical_score: 92, citizen_score: 4.8, penalty_points: 0, completed_issues: 14, average_delay_hours: 4.2 };
                    return (
                      <div key={c.id} style={{ padding: 20, borderRadius: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 99, background: "rgba(16,185,129,0.15)", color: "#10b981", textTransform: "uppercase" }}>
                            Active Contractor
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                            SLA: {c.sla_tier || 'Standard'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Contract #{c.id.slice(0, 8)}</h3>
                        <p style={{ fontSize: 12, color: "#0ea5e9", margin: "0 0 16px", fontWeight: 700 }}>{c.tenders?.title || 'Maintenance Contract'}</p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Citizen Rating</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fbbf24" }}>★ {ratingData.citizen_score || '4.8'}</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Avg Resolution</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#10b981" }}>{ratingData.average_delay_hours || '4.2'} hrs</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Completed Issues</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white" }}>{ratingData.completed_issues || 14}</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Penalty Points</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: ratingData.penalty_points > 0 ? "#ef4444" : "#10b981" }}>{ratingData.penalty_points || 0} Pts</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CITIZEN REVIEWS & FEEDBACK */}
        {viewTab === 'REVIEWS' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header score */}
            <div style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Citizen Satisfaction Overview</h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Community rating and feedback for work completed in your department area.</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>★ {avgCitizenRating}</div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", fontWeight: 700 }}>{citizenReviews.length} Total Ratings</p>
              </div>
            </div>

            {/* Reviews List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {citizenReviews.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.08)" }}>
                  <Star size={36} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>No citizen reviews submitted yet for this department.</p>
                </div>
              ) : (
                citizenReviews.map(r => (
                  <div key={r.id} style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#fbbf24" }}>★ {r.rating} / 5</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Issue #{r.issue_id?.slice(0, 8)}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>{r.comment || 'Verified by citizen.'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {dept?.management_mode === 'TENDER' && (
        <PublishTenderModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          departmentId={dept.slug || profile!.department_id!} 
        />
      )}
    </div>
  );
}
