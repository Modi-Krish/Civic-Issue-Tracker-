'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { FileText, ArrowLeft, Edit2, Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import type { Tender } from '@/lib/types/database';

export default function ManageTendersPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenders() {
      try {
        const { data, error } = await supabase
          .from('tenders')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) setTenders(data as Tender[]);
      } catch (err) {
        console.error("Failed to fetch tenders:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchTenders();
  }, [authLoading]);

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

  if (authLoading || loading) return <div className="min-h-screen bg-[#0d0d0f]" />;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white p-6 font-['Inter'] pb-24">
      {/* CSS to hide scrollbars */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <Link href="/department" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Operational Queue
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0ea5e9]/20 to-[#8b5cf6]/20 text-[#0ea5e9]">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Tender Management Portal</h1>
                <p className="text-white/40 text-sm mt-1">Review, monitor, and edit all published department tenders.</p>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm">
            {toast}
          </div>
        )}

        {/* Tenders List */}
        <div className="space-y-4">
          {tenders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/[0.05]">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-semibold">No tenders have been published yet.</p>
            </div>
          ) : (
            tenders.map((t) => (
              <div key={t.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0ea5e9] bg-[#0ea5e9]/10 px-3 py-1 rounded-full border border-[#0ea5e9]/20">
                        {t.tender_number}
                      </span>
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        t.status === 'Published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        t.status === 'Closed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        t.status === 'Awarded' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        'bg-white/5 text-white/50 border-white/10'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{t.title}</h3>
                    <p className="text-white/50 text-sm mt-1 line-clamp-2">{t.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/tenders/evaluate?tender_id=${t.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 hover:bg-[#0ea5e9]/20 text-xs font-bold uppercase tracking-wider text-[#0ea5e9] transition-colors"
                    >
                      Evaluate Bids
                    </Link>
                    <button 
                      onClick={() => setEditingTender(t)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Tender
                    </button>
                  </div>
                </div>


                {/* Details grid */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/[0.04] text-xs">
                  <div>
                    <span className="text-white/40 uppercase tracking-widest block mb-1">Tender Type</span>
                    <span className="font-semibold text-white/90">{t.tender_type}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-widest block mb-1">Est. Budget</span>
                    <span className="font-bold text-emerald-400">${t.estimated_budget?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-widest block mb-1">EMD Deposit</span>
                    <span className="font-semibold text-white/90">${t.emd_amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-widest block mb-1">Bid Deadline</span>
                    <span className="font-semibold text-amber-400">
                      {t.bid_submission_deadline ? new Date(t.bid_submission_deadline).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTender && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold">Edit Tender ({editingTender.tender_number})</h2>
                <p className="text-xs text-white/40 mt-1">Modify tender terms, budget, or update workflow status.</p>
              </div>
              <button onClick={() => setEditingTender(null)} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-white/70 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editingTender.title} 
                  onChange={(e) => setEditingTender({...editingTender, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-white/70 mb-1">Status</label>
                  <select 
                    value={editingTender.status} 
                    onChange={(e) => setEditingTender({...editingTender, status: e.target.value as any})}
                    className="w-full bg-[#1c1c22] border border-white/10 rounded-xl px-4 py-2.5 text-white"
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
                  <label className="block font-bold text-white/70 mb-1">Tender Type</label>
                  <select 
                    value={editingTender.tender_type} 
                    onChange={(e) => setEditingTender({...editingTender, tender_type: e.target.value as any})}
                    className="w-full bg-[#1c1c22] border border-white/10 rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="Open Tender">Open Tender</option>
                    <option value="Limited Tender">Limited Tender</option>
                    <option value="Emergency Tender">Emergency Tender</option>
                    <option value="Annual Maintenance Contract">Annual Maintenance Contract</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-white/70 mb-1">Estimated Budget ($)</label>
                  <input 
                    type="number" 
                    value={editingTender.estimated_budget} 
                    onChange={(e) => setEditingTender({...editingTender, estimated_budget: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/70 mb-1">EMD Deposit ($)</label>
                  <input 
                    type="number" 
                    value={editingTender.emd_amount} 
                    onChange={(e) => setEditingTender({...editingTender, emd_amount: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" 
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-white/70 mb-1">Description</label>
                <textarea 
                  rows={3} 
                  value={editingTender.description || ''} 
                  onChange={(e) => setEditingTender({...editingTender, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" 
                />
              </div>

              <div>
                <label className="block font-bold text-white/70 mb-1">Scope of Work</label>
                <textarea 
                  rows={4} 
                  value={editingTender.scope_of_work || ''} 
                  onChange={(e) => setEditingTender({...editingTender, scope_of_work: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setEditingTender(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#8b5cf6] text-white font-bold uppercase tracking-wider disabled:opacity-50"
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
