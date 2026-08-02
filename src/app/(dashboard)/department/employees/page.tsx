'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  Users, TrendingUp, CheckCircle, AlertTriangle,
  Clock, Star, BarChart2, ChevronRight, Award, Zap
} from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import PendingStaffUI from '@/components/ui/PendingStaffUI';

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

export default function EmployeesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [dept, setDept] = useState<any>(null);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({ total: 0, rate: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile?.department_id) { setLoading(false); return; }

    async function fetchData() {
      try {
        const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        // 1. Employees
        const qEmp = query(
          collection(db, 'profiles'), 
          where('department_id', '==', profile!.department_id!), 
          where('role', '==', 'employee')
        );
        const empSnap = await getDocs(qEmp);
        const rawEmployeeList = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Issues
        const qIssues = query(
          collection(db, 'issues'), 
          where('department_id', '==', profile!.department_id!)
        );
        const issuesSnap = await getDocs(qIssues);
        const issueList = issuesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Issue[];

        // 3. Department
        const deptRef = doc(db, 'departments', profile!.department_id!);
        const deptSnap = await getDoc(deptRef);
        setDept(deptSnap.exists() ? deptSnap.data() : null);

        setPendingUsers(rawEmployeeList.filter((e: any) => e.account_status === 'PENDING'));
        const approvedEmployees = rawEmployeeList.filter((e: any) => e.account_status !== 'PENDING');

        const stats = approvedEmployees.map((emp: any) => {
          const assigned = issueList.filter(i => i.assigned_employee_id === emp.id);
          const resolved = assigned.filter(i => i.status === 'CLOSED' || i.status === 'APPROVED');
          const inProgress = assigned.filter(i => i.status === 'IN_PROGRESS' || i.status === 'EMPLOYEE_ASSIGNED');
          const submitted = assigned.filter(i => i.status === 'SUBMITTED_FOR_APPROVAL');
          const rejected = assigned.filter(i => i.status === 'REJECTED');
          const successRate = assigned.length > 0 ? Math.round((resolved.length / assigned.length) * 100) : 0;
          const score = resolved.length * 10 + inProgress.length * 3 - rejected.length * 5;
          return { ...emp, totalAssigned: assigned.length, resolved: resolved.length, inProgress: inProgress.length, submitted: submitted.length, rejected: rejected.length, successRate, score };
        });
        stats.sort((a: any, b: any) => b.score - a.score);
        setEmployeeStats(stats);

        const totalResolved = issueList.filter(i => i.status === 'CLOSED' || i.status === 'APPROVED').length;
        const totalAssigned = issueList.filter(i => i.assigned_employee_id !== null).length;
        setSummaryStats({
          total: approvedEmployees.length,
          rate: totalAssigned > 0 ? Math.round((totalResolved / totalAssigned) * 100) : 0,
          resolved: totalResolved,
        });
      } catch (error) {
        console.error("Error fetching employee data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, profile, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!profile?.department_id) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 48, background: T.raised, borderRadius: 24, boxShadow: SH.insetSoft, border: `2px dashed ${T.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <p style={{ fontSize: 13, color: T.text3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>NO DEPARTMENT ASSIGNED</p>
        </div>
      </div>
    );
  }

  const RANK_COLORS = ["#D4AF37", "#9E9E9E", "#CD7F32"]; // Gold, Silver, Bronze
  const RANK_LABELS = ["#1", "#2", "#3"];

  return (
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter', -apple-system, sans-serif", color: T.text1, paddingBottom: 80 }}>
      <div style={{ maxWidth: "100%", margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ padding: "32px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 14px", borderRadius: 99, background: T.accentTint, border: `1px solid ${T.accent}30`, width: "fit-content", boxShadow: SH.raisedSm }}>
            <Users size={14} color={T.accentDark} />
            <span style={{ fontSize: 10, fontWeight: 900, color: T.accentDark, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {dept?.name} WORKFORCE
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: T.text1 }}>Team Performance</h1>
          <p style={{ fontSize: 14, color: T.text3, marginTop: 8, fontWeight: 600 }}>
            Individual metrics &amp; issue resolution tracker
          </p>
        </div>

        {/* Dept Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Staff",   value: summaryStats.total,          color: "#27500A", bg: "#EAF3DE" },
            { label: "Dept. Rate",    value: `${summaryStats.rate}%`,     color: "#0C447C", bg: "#E6F1FB" },
            { label: "Resolved",      value: summaryStats.resolved,       color: "#3C3489", bg: "#EEEDFE" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ borderRadius: 20, padding: "20px 16px", background: T.raised, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8, boxShadow: SH.raised }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}30`, boxShadow: SH.insetSoft }}>
                <span style={{ fontSize: 14, fontWeight: 900, color }}>{label.substring(0, 1)}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.text1, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            </div>
          ))}
        </div>

        <PendingStaffUI pendingUsers={pendingUsers} />

        {/* Leaderboard label */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>STAFF ROSTER</h2>
          <span style={{ fontSize: 11, color: T.text1, fontWeight: 800, padding: "4px 12px", background: T.raised, borderRadius: 99, border: `1px solid ${T.border}`, boxShadow: SH.raisedSm }}>{employeeStats.length} MEMBERS</span>
        </div>

        {employeeStats.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 24, border: `2px dashed ${T.border}`, background: T.base, boxShadow: SH.insetSoft }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>👥</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: T.text1, marginBottom: 8 }}>No Employees Yet</div>
            <div style={{ fontSize: 14, color: T.text3, fontWeight: 600 }}>Staff members will appear here once assigned to your department.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {employeeStats.map((emp, idx) => {
              const isTopThree = idx < 3;
              const rankColor = isTopThree ? RANK_COLORS[idx] : T.border;
              const circumference = 2 * Math.PI * 22;
              const strokeDash = (emp.successRate / 100) * circumference;

              return (
                <div key={emp.id} style={{ borderRadius: 24, border: `1px solid ${isTopThree ? rankColor : T.border}`, background: T.raised, overflow: "hidden", position: "relative", boxShadow: SH.raised }}>
                  <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 6, background: rankColor }} />
                  <div style={{ padding: "24px 24px 24px 32px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.base, border: `3px solid ${rankColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: T.text1, flexShrink: 0, letterSpacing: "-0.02em", boxShadow: SH.insetSoft }}>
                          {emp.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 18, fontWeight: 900, color: T.text1, letterSpacing: "-0.01em" }}>{emp.full_name || "—"}</span>
                            {isTopThree && (
                              <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 8, background: T.base, color: rankColor, border: `1px solid ${rankColor}`, textTransform: "uppercase", letterSpacing: "0.06em", boxShadow: SH.raisedSm }}>
                                RANK {RANK_LABELS[idx]}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: T.text3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {emp.totalAssigned} ISSUES ASSIGNED
                          </div>
                        </div>
                      </div>
                      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="28" cy="28" r="22" fill="none" stroke={T.border} strokeWidth="6" />
                          <circle cx="28" cy="28" r="22" fill="none" stroke={emp.successRate >= 70 ? "#1D9E75" : emp.successRate >= 40 ? "#854F0B" : "#791F1F"} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} style={{ transition: "stroke-dasharray 0.6s ease" }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: T.text1, letterSpacing: "-0.02em" }}>{emp.successRate}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                      {[
                        { label: "Resolved", value: emp.resolved, color: "#27500A", bg: "#EAF3DE" },
                        { label: "Active", value: emp.inProgress, color: "#3C3489", bg: "#EEEDFE" },
                        { label: "Pending", value: emp.submitted, color: "#0C447C", bg: "#E6F1FB" },
                        { label: "Rejected", value: emp.rejected, color: "#791F1F", bg: "#FCEBEB" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} style={{ borderRadius: 16, padding: "12px 10px", background: bg, border: `1px solid ${color}30`, textAlign: "center", boxShadow: SH.insetSoft }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: T.text2, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 6 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {emp.totalAssigned > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ height: 8, borderRadius: 99, background: T.base, overflow: "hidden", border: `1px solid ${T.border}`, boxShadow: SH.insetSoft }}>
                          <div style={{ height: "100%", borderRadius: 99, width: `${emp.successRate}%`, background: emp.successRate >= 70 ? "#1D9E75" : emp.successRate >= 40 ? "#D4AF37" : "#791F1F", transition: "width 0.8s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                          <span style={{ fontSize: 10, color: T.text3, fontWeight: 800, letterSpacing: "0.05em" }}>RESOLUTION RATE</span>
                          <span style={{ fontSize: 10, color: T.text1, fontWeight: 800, letterSpacing: "0.05em" }}>{emp.resolved}/{emp.totalAssigned} CLOSED</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
