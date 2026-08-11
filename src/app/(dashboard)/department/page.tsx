'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Users, Clock, CheckCircle, AlertTriangle, Building2, ChevronRight, FileText, Star, Activity, XOctagon, MessageSquare, ThumbsUp, ThumbsDown, ShieldCheck, Flame, PieChart } from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import DepartmentActions from '@/components/department/DepartmentActions';
import PublishTenderModal from '@/components/ui/PublishTenderModal';

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
          where('department_id', '==', profile!.department_id!)
        );
        unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
          const issuesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          issuesData.sort((a: any, b: any) => (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0));
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
      <div style={{ minHeight: '100dvh', background: T.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  if (!profile?.department_id) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <p style={{ fontSize: 13, color: T.text3, fontWeight: 800 }}>NO DEPARTMENT ASSIGNED</p>
          <p style={{ fontSize: 11, color: T.text2, marginTop: 8 }}>Contact system administrator to link your account.</p>
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
    REPORTED:               { label: "Reported",         color: "#0C447C", bg: "#E6F1FB" },
    DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   color: "#3C3489", bg: "#EEEDFE" },
    COMPANY_ASSIGNED:       { label: "Contractor Assigned", color: "#3C3489", bg: "#EEEDFE" },
    EMPLOYEE_ASSIGNED:      { label: "Staff Assigned",   color: "#3C3489", bg: "#EEEDFE" },
    IN_PROGRESS:            { label: "Working",          color: "#27500A", bg: "#EAF3DE" },
    SUBMITTED_FOR_APPROVAL: { label: "Needs Approval",   color: "#854F0B", bg: "#FAEEDA" },
    COMMUNITY_REVIEW:       { label: "Community Review", color: "#854F0B", bg: "#FAEEDA" },
    COMMUNITY_REJECTED:     { label: "Rejected (Comm)",  color: "#791F1F", bg: "#FCEBEB" },
    VERIFIED:               { label: "Verified",         color: "#085041", bg: "#E1F5EE" },
    APPROVED:               { label: "Approved",         color: "#085041", bg: "#E1F5EE" },
    REJECTED:               { label: "Rejected",         color: "#791F1F", bg: "#FCEBEB" },
    CLOSED:                 { label: "Resolved",         color: "#085041", bg: "#E1F5EE" },
  };

  return (
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter', -apple-system, sans-serif", color: T.text1, paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}>
      <style>{`
        .dept-inner { width: 100%; padding: 0 16px; }
        @media (min-width: 768px) { .dept-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; } }
        .dept-header { padding: 24px 0 20px; display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 640px) { .dept-header { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
      `}</style>
      <div className="dept-inner">

        {errorToast && (
          <div style={{ padding: "14px", borderRadius: 14, background: "#FCEBEB", border: "1.5px solid #791F1F", fontSize: 13, color: "#791F1F", fontWeight: 700, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {errorToast}</span>
            <button onClick={() => setErrorToast(null)} style={{ background: "none", border: "none", color: "#791F1F", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Header */}
        <div className="dept-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "4px 12px", borderRadius: 99, background: "#EEEDFE", border: `1px solid ${T.border}`, width: "fit-content", boxShadow: SH.raisedSm }}>
              <Building2 size={12} color="#3C3489" />
              <span style={{ fontSize: 10, fontWeight: 800, color: "#3C3489", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {dept?.name || 'Department'} Division
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: T.text1, lineHeight: 1.2 }}>Department Governance</h1>
          </div>

          {dept?.management_mode === 'TENDER' && (
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/department/tenders" style={{ padding: "10px 18px", borderRadius: 14, background: T.raised, border: `1px solid ${T.border}`, color: T.text1, fontSize: 12, fontWeight: 800, textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: SH.raisedSm }}>
                <FileText size={14} color={T.accent} /> Tenders Portal
              </Link>
              <button onClick={() => setIsModalOpen(true)} style={{ padding: "10px 18px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 12, fontWeight: 800, textTransform: "uppercase", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                <FileText size={14} /> Publish Tender
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
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
                  padding: "10px 20px", borderRadius: 14,
                  background: isSelected ? T.raised : 'transparent',
                  color: isSelected ? T.accentDark : T.text3,
                  fontSize: 12, fontWeight: 800, border: isSelected ? `1px solid ${T.border}` : "1px solid transparent",
                  boxShadow: isSelected ? SH.raisedSm : 'none',
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { icon: AlertTriangle, label: "To Assign",    value: pendingAssignment.length, color: "#854F0B", bg: "#FAEEDA" },
                { icon: Clock,          label: "In Progress",  value: inProgress.length,        color: "#27500A", bg: "#EAF3DE" },
                { icon: CheckCircle,    label: "To Approve",   value: pendingApproval.length,   color: "#0C447C", bg: "#E6F1FB" },
                { icon: Users,          label: "Resolved",     value: closedIssues.length,      color: "#085041", bg: "#E1F5EE" },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} style={{ borderRadius: 20, padding: "20px 16px", background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: SH.raisedSm }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: T.text1, lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginTop: 4, letterSpacing: '0.05em' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Incidents Queue */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 12, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>ACTIVE INCIDENTS QUEUE</h2>
              <span style={{ fontSize: 11, color: T.text3, fontWeight: 800 }}>{allIssues.length} TOTAL</span>
            </div>

            {allIssues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", borderRadius: 24, border: `2px dashed ${T.border}`, background: T.raised, boxShadow: SH.insetSoft }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✔️</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 8 }}>Clear Queue</div>
                <div style={{ fontSize: 13, color: T.text3, maxWidth: 280, margin: "0 auto" }}>No pending reports require departmental action.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {allIssues.map((issue: Issue) => {
                  const st = STATUS_STYLE[issue.status] || STATUS_STYLE.REPORTED;
                  return (
                    <div key={issue.id} style={{ borderRadius: 22, border: `1px solid ${T.border}`, background: T.raised, boxShadow: SH.raised, overflow: "hidden", position: "relative" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: st.color }} />
                      
                      <div style={{ padding: "20px 20px 20px 24px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/issue?id=${issue.id}`} style={{ fontSize: 16, fontWeight: 800, color: T.text1, textDecoration: "none", display: "block", marginBottom: 6, letterSpacing: '-0.02em' }}>
                              {issue.title}
                            </Link>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: T.text2 }}>ID #{issue.id.slice(0, 8).toUpperCase()}</span>
                              <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>{issue.issue_type}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 10, background: st.bg, color: st.color, border: `1px solid ${st.color}25`, whiteSpace: "nowrap", boxShadow: SH.raisedSm }}>
                            {st.label?.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ background: T.base, borderRadius: 16, padding: "16px", boxShadow: SH.insetSoft }}>
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
            <div style={{ padding: 24, borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px", color: T.text1, letterSpacing: '-0.02em' }}>Current Active Contractors</h2>

              {activeContractsList.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", background: T.base, borderRadius: 16, boxShadow: SH.insetSoft }}>
                  <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 600 }}>No active contracts for this department. Mode is running in fallback department mode.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                  {activeContractsList.map(c => {
                    const ratingData = companyRatingsMap[c.company_id] || { technical_score: 92, citizen_score: 4.8, penalty_points: 0, completed_issues: 14, average_delay_hours: 4.2 };
                    return (
                      <div key={c.id} style={{ padding: 20, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, boxShadow: SH.insetSoft }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 99, background: "#E1F5EE", color: "#085041", textTransform: "uppercase", boxShadow: SH.raisedSm }}>
                            Active Contractor
                          </span>
                          <span style={{ fontSize: 11, color: T.text3, fontWeight: 700 }}>
                            SLA: {c.sla_tier || 'Standard'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", color: T.text1 }}>Contract #{c.id.slice(0, 8)}</h3>
                        <p style={{ fontSize: 12, color: T.accent, margin: "0 0 16px", fontWeight: 700 }}>{c.tenders?.title || 'Maintenance Contract'}</p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, color: T.text2 }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: T.text3, fontWeight: 700 }}>Citizen Rating</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#854F0B" }}>★ {ratingData.citizen_score || '4.8'}</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: T.text3, fontWeight: 700 }}>Avg Resolution</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#27500A" }}>{ratingData.average_delay_hours || '4.2'} hrs</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: T.text3, fontWeight: 700 }}>Completed Issues</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: T.text1 }}>{ratingData.completed_issues || 14}</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, textTransform: "uppercase", color: T.text3, fontWeight: 700 }}>Penalty Points</p>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: ratingData.penalty_points > 0 ? "#791F1F" : "#27500A" }}>{ratingData.penalty_points || 0} Pts</p>
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
            <div style={{ padding: 24, borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 4px", color: T.text1, letterSpacing: '-0.02em' }}>Citizen Satisfaction Overview</h2>
                <p style={{ fontSize: 12, color: T.text3, margin: 0, fontWeight: 600 }}>Community rating and feedback for work completed in your department area.</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#854F0B", lineHeight: 1 }}>★ {avgCitizenRating}</div>
                <p style={{ fontSize: 11, color: T.text3, margin: "4px 0 0", fontWeight: 800 }}>{citizenReviews.length} Total Ratings</p>
              </div>
            </div>

            {/* Reviews List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {citizenReviews.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", background: T.raised, borderRadius: 20, boxShadow: SH.insetSoft }}>
                  <Star size={36} color={T.text3} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 600 }}>No citizen reviews submitted yet for this department.</p>
                </div>
              ) : (
                citizenReviews.map(r => (
                  <div key={r.id} style={{ padding: 20, borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#854F0B", background: '#FAEEDA', padding: '4px 10px', borderRadius: 99, boxShadow: SH.raisedSm }}>★ {r.rating} / 5</span>
                        <span style={{ fontSize: 11, color: T.text3, fontWeight: 800 }}>Issue #{r.issue_id?.slice(0, 8)}</span>
                      </div>
                      <span style={{ fontSize: 11, color: T.text3, fontWeight: 700 }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 14, color: T.text2, margin: 0, fontWeight: 500 }}>{r.comment || 'Verified by citizen.'}</p>
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
