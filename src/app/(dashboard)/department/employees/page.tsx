'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  Users, TrendingUp, CheckCircle, AlertTriangle,
  Clock, Star, BarChart2, ChevronRight, Award, Zap
} from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import PendingStaffUI from '@/components/ui/PendingStaffUI';

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
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  if (!profile?.department_id) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>NO DEPARTMENT ASSIGNED</p>
        </div>
      </div>
    );
  }

  const RANK_COLORS = ["#fbbf24", "#94a3b8", "#b45309"];
  const RANK_LABELS = ["#1", "#2", "#3"];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 80 }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, right: "5%", width: 420, height: 320, background: "radial-gradient(ellipse,rgba(16,185,129,0.05) 0%,transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: 100, left: "0%", width: 350, height: 250, background: "radial-gradient(ellipse,rgba(59,130,246,0.04) 0%,transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <div style={{ padding: "32px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "4px 12px", borderRadius: 99, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", width: "fit-content" }}>
            <Users size={12} color="#10b981" />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {dept?.name} WORKFORCE
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Team Performance</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6, fontWeight: 500 }}>
            Individual metrics &amp; issue resolution tracker
          </p>
        </div>

        {/* Dept Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Total Staff",   value: summaryStats.total,          color: "#10b981", bg: "rgba(16,185,129,0.08)",   icon: Users },
            { label: "Dept. Rate",    value: `${summaryStats.rate}%`,     color: "#3b82f6", bg: "rgba(59,130,246,0.08)",   icon: TrendingUp },
            { label: "Resolved",      value: summaryStats.resolved,       color: "#a78bfa", bg: "rgba(167,139,250,0.08)",  icon: CheckCircle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} style={{ borderRadius: 18, padding: "16px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} color={color} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            </div>
          ))}
        </div>

        <PendingStaffUI pendingUsers={pendingUsers} />

        {/* Leaderboard label */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>STAFF ROSTER</h2>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{employeeStats.length} MEMBERS</span>
        </div>

        {employeeStats.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.3 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 6 }}>No Employees Yet</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Staff members will appear here once assigned to your department.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {employeeStats.map((emp, idx) => {
              const isTopThree = idx < 3;
              const rankColor = isTopThree ? RANK_COLORS[idx] : "rgba(255,255,255,0.15)";
              const circumference = 2 * Math.PI * 18;
              const strokeDash = (emp.successRate / 100) * circumference;

              return (
                <div key={emp.id} style={{ borderRadius: 20, border: `1px solid ${isTopThree ? `${rankColor}25` : "rgba(255,255,255,0.07)"}`, background: isTopThree ? `rgba(255,255,255,0.035)` : "rgba(255,255,255,0.02)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: rankColor }} />
                  <div style={{ padding: "18px 18px 18px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${rankColor}30, ${rankColor}10)`, border: `1.5px solid ${rankColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: rankColor, flexShrink: 0, letterSpacing: "-0.02em" }}>
                        {emp.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>{emp.full_name || "—"}</span>
                          {isTopThree && (
                            <span style={{ fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 6, background: `${rankColor}20`, color: rankColor, border: `1px solid ${rankColor}35`, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {RANK_LABELS[idx]}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {emp.totalAssigned} ISSUES ASSIGNED
                        </div>
                      </div>
                      <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                          <circle cx="24" cy="24" r="18" fill="none" stroke={emp.successRate >= 70 ? "#10b981" : emp.successRate >= 40 ? "#fbbf24" : "#ef4444"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} style={{ transition: "stroke-dasharray 0.6s ease" }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{emp.successRate}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {[
                        { label: "Resolved", value: emp.resolved, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
                        { label: "Active", value: emp.inProgress, color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
                        { label: "Pending", value: emp.submitted, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
                        { label: "Rejected", value: emp.rejected, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} style={{ borderRadius: 12, padding: "10px 8px", background: bg, border: `1px solid ${color}20`, textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {emp.totalAssigned > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 99, width: `${emp.successRate}%`, background: emp.successRate >= 70 ? "linear-gradient(90deg, #10b981, #34d399)" : emp.successRate >= 40 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #ef4444, #f87171)", transition: "width 0.8s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>RESOLUTION RATE</span>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{emp.resolved}/{emp.totalAssigned} CLOSED</span>
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
