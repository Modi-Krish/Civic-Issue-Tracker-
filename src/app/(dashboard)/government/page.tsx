'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, FileText, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import PublishTenderModal from '@/components/ui/PublishTenderModal';
import type { Tender } from '@/lib/types/database';

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

  const statCards = [
    { label: 'Published Tenders', value: stats.openTenders,     bg: '#E6F1FB', fg: '#0C447C', Icon: Briefcase },
    { label: 'Active Contracts',  value: stats.activeContracts, bg: '#EAF3DE', fg: '#27500A', Icon: ShieldCheck },
    { label: 'Reported Incidents',value: stats.reportedIssues,  bg: '#FAEEDA', fg: '#854F0B', Icon: AlertTriangle },
  ];

  return (
    <div style={{
      minHeight: '100dvh', background: T.base,
      fontFamily: "'Inter', sans-serif", color: T.text1,
      padding: '0 0 calc(90px + env(safe-area-inset-bottom, 0px))',
    }}>
      <style>{`
        .gov-container {
          width: 100%;
          padding: 24px 16px 0;
        }
        @media (min-width: 768px) {
          .gov-container {
            max-width: 1300px;
            margin: 0 auto;
            padding: 36px 32px 0;
          }
        }
        .gov-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (min-width: 640px) {
          .gov-header {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
        }
        .gov-header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .gov-stat-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }
        @media (min-width: 480px) {
          .gov-stat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) {
          .gov-stat-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        }
        .gov-bottom-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) {
          .gov-bottom-grid { grid-template-columns: 2fr 1fr; }
        }
        .gov-tender-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 640px) {
          .gov-tender-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="gov-container">

        {/* ── Header ── */}
        <header className="gov-header">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 6px', color: T.text1, lineHeight: 1.15 }}>
              City Command Center
            </h1>
            <p style={{ color: T.text3, margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              Oversee city infrastructure, issue tenders, and approve contractor works.
            </p>
          </div>
          <div className="gov-header-actions">
            <Link href="/department/tenders" style={{
              padding: '11px 16px', borderRadius: 14, background: T.raised,
              border: `1px solid ${T.border}`, color: T.text1,
              fontSize: 12, fontWeight: 800, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              boxShadow: SH.raisedSm, whiteSpace: 'nowrap',
            }}>
              <FileText size={15} color={T.accent} /> Manage Tenders
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '11px 18px', borderRadius: 14,
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                color: 'white', fontSize: 12, fontWeight: 800, border: 'none',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                gap: 7, boxShadow: `${SH.raisedSm}, 0 6px 20px ${T.accent}40`,
                whiteSpace: 'nowrap',
              }}>
              <FileText size={15} /> Publish Tender
            </button>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="gov-stat-grid">
          {statCards.map(({ label, value, bg, fg, Icon }) => (
            <div key={label} style={{
              padding: '18px 20px', borderRadius: 22,
              background: T.raised, border: `1px solid ${T.border}`,
              boxShadow: SH.raised, display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 15, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: fg, flexShrink: 0, boxShadow: SH.insetSoft,
              }}>
                <Icon size={22} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  {label}
                </p>
                <h3 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.03em' }}>
                  {loading ? '–' : value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* ── Live Tenders + Quick Actions ── */}
        <div className="gov-bottom-grid">

          {/* Live Published Tenders */}
          <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: '24px 20px', boxShadow: SH.raised }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: T.text1, letterSpacing: '-0.02em' }}>
                Live Published Tenders
              </h2>
              <Link href="/department/tenders" style={{ fontSize: 12, fontWeight: 800, color: T.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View & Edit All <ArrowRight size={13} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tenders.length === 0 ? (
                <p style={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>No tenders published yet.</p>
              ) : (
                tenders.slice(0, 5).map(t => (
                  <div key={t.id} style={{
                    padding: '16px', borderRadius: 18, background: T.base,
                    border: `1px solid ${T.border}`, boxShadow: SH.insetSoft,
                  }}>
                    <div className="gov-tender-card">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#0C447C', background: '#E6F1FB', padding: '3px 9px', borderRadius: 99, boxShadow: SH.raisedSm, whiteSpace: 'nowrap' }}>{t.tender_number}</span>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#27500A', background: '#EAF3DE', padding: '3px 9px', borderRadius: 99, boxShadow: SH.raisedSm, whiteSpace: 'nowrap' }}>{t.status}</span>
                        </div>
                        <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 4px', color: T.text1, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</h4>
                        <p style={{ fontSize: 12, color: T.text2, margin: 0, fontWeight: 600 }}>Budget: ${t.estimated_budget?.toLocaleString()} · {t.tender_type}</p>
                      </div>
                      <Link href={`/admin/tenders/evaluate?tender_id=${t.id}`} style={{
                        padding: '9px 16px', borderRadius: 11, background: T.raised,
                        border: `1px solid ${T.border}`, color: T.accentDark,
                        fontSize: 12, fontWeight: 800, textDecoration: 'none',
                        boxShadow: SH.raisedSm, flexShrink: 0, whiteSpace: 'nowrap',
                        alignSelf: 'flex-start',
                      }}>
                        Evaluate Bids
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, padding: '24px 20px', boxShadow: SH.raised }}>
            <h2 style={{ fontSize: 17, fontWeight: 900, margin: '0 0 18px', color: T.text1, letterSpacing: '-0.02em' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { href: '/department/tenders', label: 'View & Edit Tenders',  accent: T.accent },
                { href: '/admin/tenders/evaluate', label: 'Evaluate Bids & Award', accent: '#854F0B' },
              ].map(({ href, label, accent }) => (
                <Link key={href} href={href} style={{
                  padding: '14px 16px', borderRadius: 14, background: T.base,
                  border: `1px solid ${T.border}`, color: T.text1, textDecoration: 'none',
                  fontSize: 13, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: SH.insetSoft, minHeight: 52,
                }}>
                  <span>{label}</span>
                  <ArrowRight size={14} color={accent} />
                </Link>
              ))}
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
