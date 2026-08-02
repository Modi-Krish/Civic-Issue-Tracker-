'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import Link from 'next/link';
import { Briefcase, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import EmployeeActions from '@/components/employee/EmployeeActions';

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
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; barColor: string }> = {
  REPORTED:               { label: 'Reported',         color: '#0C447C', bg: '#E6F1FB', barColor: '#0C447C' },
  IN_PROGRESS:            { label: 'In Progress',      color: '#854F0B', bg: '#FAEEDA', barColor: '#854F0B' },
  APPROVED:               { label: 'Approved',          color: '#085041', bg: '#E1F5EE', barColor: T.accent },
  CLOSED:                 { label: 'Resolved',          color: '#085041', bg: '#E1F5EE', barColor: T.accent },
  EMPLOYEE_ASSIGNED:      { label: 'Assigned To You',  color: '#3C3489', bg: '#EEEDFE', barColor: '#3C3489' },
  SUBMITTED_FOR_APPROVAL: { label: 'Pending Review',   color: '#712B13', bg: '#FAECE7', barColor: '#712B13' },
  DEPARTMENT_ASSIGNED:    { label: 'Dept Assigned',    color: '#0C447C', bg: '#E6F1FB', barColor: '#0C447C' },
  REJECTED:               { label: 'Needs Revisiting', color: '#791F1F', bg: '#FCEBEB', barColor: '#791F1F' },
};

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [allTasks, setAllTasks] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    let unsubscribe: (() => void) | null = null;

    async function setupRealtime() {
      try {
        const { collection, query, where, onSnapshot, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'issues'), where('assigned_employee_id', '==', user!.id), orderBy('created_at', 'desc'));
        unsubscribe = onSnapshot(q, snapshot => {
          setAllTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Issue[]);
          setLoading(false);
        }, err => {
          console.error('Error listening to tasks:', err);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up tasks listener:', error);
        setLoading(false);
      }
    }

    setupRealtime();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: T.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  if (!user) return null;

  const activeTasks    = allTasks.filter(i => i.status !== 'CLOSED' && i.status !== 'APPROVED');
  const completedTasks = allTasks.filter(i => i.status === 'CLOSED' || i.status === 'APPROVED');

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.base,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      color: T.text1,
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ padding: '32px 0 24px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 6px', color: T.text1 }}>
            My Assignments
          </h1>
          <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 600 }}>
            Operational force status:{' '}
            <span style={{ color: activeTasks.length > 0 ? '#854F0B' : T.accentDark, fontWeight: 800 }}>
              {activeTasks.length > 0 ? 'ACTIVE' : 'READY'}
            </span>
          </p>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Active Jobs',  value: activeTasks.length,    bg: '#FAEEDA', fg: '#854F0B', Icon: AlertTriangle },
            { label: 'Resolutions', value: completedTasks.length, bg: T.accentTint, fg: T.accentDark, Icon: CheckCircle },
          ].map(({ label, value, bg, fg, Icon }) => (
            <div key={label} style={{
              borderRadius: 20, padding: '20px 18px',
              background: T.raised, boxShadow: SH.raised,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: SH.raisedSm,
              }}>
                <Icon size={20} color={fg} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: T.text1, lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {allTasks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 20px',
            background: T.raised, borderRadius: 24, boxShadow: SH.inset,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: T.accentTint, boxShadow: SH.raisedSm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Briefcase size={32} color={T.accentDark} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 8 }}>Queue is empty</div>
            <div style={{ fontSize: 13, color: T.text3, maxWidth: 280, margin: '0 auto' }}>
              New tasks assigned by your department admin will appear here instantly.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
              Task Registry
            </h2>
            {allTasks.map((issue: Issue) => {
              const st = STATUS_STYLE[issue.status] ?? STATUS_STYLE.REPORTED;
              return (
                <div key={issue.id} style={{
                  borderRadius: 20, background: T.raised, boxShadow: SH.raised,
                  overflow: 'hidden', position: 'relative',
                }}>
                  {/* Left bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: st.barColor, borderRadius: '0 2px 2px 0' }} />

                  <div style={{ padding: '18px 18px 18px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/issue?id=${issue.id}`} style={{
                          fontSize: 15, fontWeight: 800, color: T.text1, textDecoration: 'none',
                          letterSpacing: '-0.01em', display: 'block', marginBottom: 5,
                        }}>
                          {issue.title}
                        </Link>
                        <span style={{ fontSize: 12, color: T.text3, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                          <MapPin size={12} color={T.accent} />
                          {issue.location_label || 'Local Assignment'}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '5px 12px', borderRadius: 10,
                        background: st.bg, color: st.color, whiteSpace: 'nowrap', flexShrink: 0,
                        boxShadow: SH.raisedSm,
                      }}>
                        {st.label?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{
                      background: T.base, borderRadius: 14, padding: 14,
                      boxShadow: SH.inset,
                    }}>
                      <EmployeeActions issue={issue} />
                    </div>
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
