'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { FileText, ArrowLeft, Edit2, Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
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
  insetSoft:`inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

export default function ManageTendersPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [departmentMode, setDepartmentMode] = useState<string | null>(null);
  const [deptInfo, setDeptInfo] = useState<any>(null);

  useEffect(() => {
    async function fetchTenders() {
      try {
        const userDeptSlug = profile?.department_id;
        let mode = 'DEPARTMENT';
        let deptDocData: any = null;

        if (userDeptSlug) {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const q = query(collection(db, 'departments'), where('slug', '==', String(userDeptSlug).toLowerCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            deptDocData = snap.docs[0].data();
            mode = deptDocData.management_mode || 'DEPARTMENT';
          }
        }

        if (profile?.role === 'superadmin' || profile?.role === 'admin' || profile?.role === 'government_official') {
          mode = 'TENDER';
        }

        setDepartmentMode(mode);
        setDeptInfo(deptDocData);

        if (mode === 'TENDER') {
          const { data, error } = await supabase
            .from('tenders')
            .select('*')
            .order('created_at', { ascending: false });

          if (data) {
            const filtered = userDeptSlug
              ? data.filter(t => t.department_id === deptDocData?.id || t.department_id === userDeptSlug || t.title?.toLowerCase().includes(String(userDeptSlug).toLowerCase()))
              : data;
            setTenders((filtered.length > 0 ? filtered : data) as Tender[]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tenders:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchTenders();
  }, [authLoading, profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTender) return;

    setIsUpdating(true);
    try {
      const res = await fetch('/api/tenders/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTender.id,
          title: editingTender.title,
          description: editingTender.description,
          scopeOfWork: editingTender.scope_of_work,
          tenderType: editingTender.tender_type,
          budget: editingTender.estimated_budget,
          emd: editingTender.emd_amount,
          startDate: editingTender.contract_start_date,
          endDate: editingTender.contract_end_date,
          bidDeadline: editingTender.bid_submission_deadline,
          status: editingTender.status
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Update failed");

      setTenders(prev => prev.map(t => t.id === editingTender.id ? data.tender : t));
      setToast("Tender updated successfully!");
      setEditingTender(null);
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update tender");
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.base, color: T.text1, padding: "24px 16px 100px", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ maxWidth: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        
        {/* Header */}
        <div>
          <Link href="/department" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text3, fontWeight: 700, textDecoration: "none", marginBottom: 16 }}>
            <ArrowLeft size={16} />
            Back to Operational Queue
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: T.raised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accentDark, boxShadow: SH.raisedSm }}>
                <FileText size={28} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px", color: T.text1 }}>Tender Management Portal</h1>
                <p style={{ color: T.text3, fontSize: 13, margin: 0, fontWeight: 600 }}>Review, monitor, and edit all published department tenders.</p>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div style={{ padding: 16, borderRadius: 16, background: "#EAF3DE", border: "1px solid #27500A30", color: "#27500A", fontWeight: 800, fontSize: 14, boxShadow: SH.insetSoft }}>
            {toast}
          </div>
        )}

        {/* Tenders List / Access Restriction */}
        {departmentMode !== 'TENDER' ? (
          <div style={{ padding: 48, textAlign: "center", borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
            <AlertTriangle size={48} color="#854F0B" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 900, color: T.text1, margin: "0 0 8px" }}>Tender Mode Disabled</h2>
            <p style={{ color: T.text2, fontSize: 14, fontWeight: 600, maxWidth: 540, margin: "0 auto 24px", lineHeight: 1.6 }}>
              The Tender Management Portal is only accessible to departments currently configured in <strong>TENDER Mode</strong>. Your department (<strong>{deptInfo?.name || profile?.department_id || 'Department'}</strong>) is currently in <strong>Internal / Department Assignment Mode</strong>.
            </p>
            <Link href="/department" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 14, background: T.accent, color: "white", fontWeight: 800, textDecoration: "none", fontSize: 13, boxShadow: SH.raisedSm }}>
              <ArrowLeft size={16} /> Return to Operational Queue
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {tenders.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", borderRadius: 24, background: T.base, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
                <FileText size={48} color={T.text3} style={{ margin: "0 auto 12px" }} />
                <p style={{ color: T.text3, fontSize: 14, fontWeight: 700, margin: 0 }}>No tenders have been published for your department yet.</p>
              </div>
            ) : (
            tenders.map((t) => (
              <div key={t.id} style={{ padding: 24, borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0C447C", background: "#E6F1FB", border: "1px solid #0C447C30", padding: "4px 12px", borderRadius: 99, boxShadow: SH.raisedSm }}>
                        {t.tender_number}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 99, 
                        background: t.status === 'Published' ? "#EAF3DE" : t.status === 'Closed' ? "#FAEEDA" : t.status === 'Awarded' ? "#EEEDFE" : T.raised,
                        color: t.status === 'Published' ? "#27500A" : t.status === 'Closed' ? "#854F0B" : t.status === 'Awarded' ? "#3C3489" : T.text3,
                        border: t.status === 'Published' ? "none" : t.status === 'Closed' ? "none" : t.status === 'Awarded' ? "none" : `1px solid ${T.border}`,
                        boxShadow: SH.raisedSm
                      }}>
                        {t.status}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: T.text1, margin: "0 0 8px" }}>{t.title}</h3>
                    <p style={{ color: T.text3, fontSize: 14, margin: 0, fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.description}</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Link
                      href={`/admin/tenders/evaluate?tender_id=${t.id}`}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 14, background: "#E6F1FB", border: "1px solid #0C447C30", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0C447C", textDecoration: "none", boxShadow: SH.raisedSm }}
                    >
                      Evaluate Bids
                    </Link>
                    <button 
                      onClick={() => setEditingTender(t)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 14, background: T.raised, border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text1, cursor: "pointer", boxShadow: SH.raisedSm }}
                    >
                      <Edit2 size={16} />
                      Edit Tender
                    </button>
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                  <div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, fontWeight: 900, display: "block", marginBottom: 4 }}>Tender Type</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>{t.tender_type}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, fontWeight: 900, display: "block", marginBottom: 4 }}>Est. Budget</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: T.accentDark }}>${t.estimated_budget?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, fontWeight: 900, display: "block", marginBottom: 4 }}>EMD Deposit</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>${t.emd_amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, fontWeight: 900, display: "block", marginBottom: 4 }}>Bid Deadline</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#854F0B" }}>
                      {t.bid_submission_deadline ? new Date(t.bid_submission_deadline).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTender && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.base, border: `1px solid ${T.border}`, borderRadius: 24, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: SH.raised }} className="no-scrollbar">
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, paddingBottom: 24, marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: T.text1, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Edit Tender ({editingTender.tender_number})</h2>
                <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 600 }}>Modify tender terms, budget, or update workflow status.</p>
              </div>
              <button onClick={() => setEditingTender(null)} style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: T.text3, cursor: "pointer", boxShadow: SH.raisedSm, fontSize: 16, fontWeight: 900 }}>✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Title</label>
                <input 
                  type="text" 
                  value={editingTender.title} 
                  onChange={(e) => setEditingTender({...editingTender, title: e.target.value})}
                  style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box" }} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Status</label>
                  <select 
                    value={editingTender.status} 
                    onChange={(e) => setEditingTender({...editingTender, status: e.target.value as any})}
                    style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box", cursor: "pointer" }}
                  >
                    <option value="Published">Published</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Awarded">Awarded</option>
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Tender Type</label>
                  <select 
                    value={editingTender.tender_type} 
                    onChange={(e) => setEditingTender({...editingTender, tender_type: e.target.value as any})}
                    style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box", cursor: "pointer" }}
                  >
                    <option value="Open Tender">Open Tender</option>
                    <option value="Limited Tender">Limited Tender</option>
                    <option value="Emergency Tender">Emergency Tender</option>
                    <option value="Annual Maintenance Contract">Annual Maintenance Contract</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Estimated Budget ($)</label>
                  <input 
                    type="number" 
                    value={editingTender.estimated_budget} 
                    onChange={(e) => setEditingTender({...editingTender, estimated_budget: parseFloat(e.target.value) || 0})}
                    style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box" }} 
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>EMD Deposit ($)</label>
                  <input 
                    type="number" 
                    value={editingTender.emd_amount} 
                    onChange={(e) => setEditingTender({...editingTender, emd_amount: parseFloat(e.target.value) || 0})}
                    style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box" }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Description</label>
                <textarea 
                  rows={3} 
                  value={editingTender.description || ''} 
                  onChange={(e) => setEditingTender({...editingTender, description: e.target.value})}
                  style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box", resize: "vertical" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Scope of Work</label>
                <textarea 
                  rows={4} 
                  value={editingTender.scope_of_work || ''} 
                  onChange={(e) => setEditingTender({...editingTender, scope_of_work: e.target.value})}
                  style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", color: T.text1, fontSize: 14, fontWeight: 700, outline: "none", boxShadow: SH.insetSoft, boxSizing: "border-box", resize: "vertical" }} 
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 24, borderTop: `1px solid ${T.border}`, marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setEditingTender(null)}
                  style={{ padding: "12px 24px", borderRadius: 14, background: T.raised, border: `1px solid ${T.border}`, color: T.text1, fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", boxShadow: SH.raisedSm }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  style={{ padding: "12px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", border: "none", cursor: "pointer", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40`, opacity: isUpdating ? 0.5 : 1 }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
