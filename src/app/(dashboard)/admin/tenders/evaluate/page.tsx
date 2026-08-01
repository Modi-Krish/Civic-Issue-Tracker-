'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle, AlertTriangle, ShieldCheck, DollarSign, Star, FileText, Award, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Tender, TenderBid, CompanyRating } from '@/lib/types/database';

function TenderEvaluationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenderIdParam = searchParams.get('tender_id');

  const [allTenders, setAllTenders] = useState<Tender[]>([]);
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<(TenderBid & { company_rating?: CompanyRating, ai_score?: number, recommended?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Weights configuration
  const weights = {
    price: 0.35,
    technical: 0.20,
    citizen: 0.15,
    department: 0.15,
    penalty: -0.15 // Negative weight for penalties
  };

  useEffect(() => {
    async function fetchTenderData() {
      setLoading(true);
      try {
        // 1. Fetch all tenders list for dropdown selection
        const { data: allList } = await supabase
          .from('tenders')
          .select('*')
          .order('created_at', { ascending: false });

        if (allList) setAllTenders(allList as Tender[]);

        let activeTender: Tender | null = null;

        if (tenderIdParam) {
          // Query by ID or tender_number (e.g. TND-2026-5776)
          const { data: tData } = await supabase
            .from('tenders')
            .select('*')
            .or(`id.eq.${tenderIdParam},tender_number.eq.${tenderIdParam}`)
            .maybeSingle();
          if (tData) activeTender = tData as Tender;
        }

        // If no tenderId provided or not found, auto-fetch the first tender in list
        if (!activeTender && allList && allList.length > 0) {
          activeTender = allList[0] as Tender;
        }

        setTender(activeTender);

        if (activeTender) {
          // 2. Fetch Bids for the active tender
          const { data: bidsData } = await supabase
            .from('tender_bids')
            .select('*')
            .eq('tender_id', activeTender.id);
          
          if (bidsData && bidsData.length > 0) {
            // 3. Fetch Company Ratings for Bidders
            const companyIds = bidsData.map(b => b.company_id);
            const { data: ratingsData } = await supabase
              .from('company_ratings')
              .select('*')
              .in('company_id', companyIds);

            // 4. Calculate Scores (AI Recommendation Heuristic)
            const minBidAmount = Math.min(...bidsData.map(b => b.bid_amount));

            const scoredBids = bidsData.map(bid => {
              const rating = ratingsData?.find(r => r.company_id === bid.company_id);
              
              let aiScore = 0;
              if (rating) {
                const priceScore = (minBidAmount / (bid.bid_amount || 1)) * 100;
                aiScore = (priceScore * weights.price) +
                          (rating.technical_score * weights.technical) +
                          (rating.citizen_score * weights.citizen) +
                          (rating.department_score * weights.department) +
                          (rating.penalty_points * weights.penalty);
              } else {
                const priceScore = (minBidAmount / (bid.bid_amount || 1)) * 100;
                aiScore = (priceScore * weights.price) + 60;
              }

              return {
                ...bid,
                company_rating: rating,
                ai_score: Math.max(0, Math.min(100, aiScore))
              };
            }).sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

            if (scoredBids.length > 0) {
              scoredBids[0].recommended = true;
            }

            setBids(scoredBids);
          } else {
            setBids([]);
          }
        }
      } catch (err) {
        console.error("Error fetching evaluation data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTenderData();
  }, [tenderIdParam]);

  const handleAwardContract = async (bid: TenderBid) => {
    if (!tender) return;
    setAwardingId(bid.id);
    try {
      const res = await fetch('/api/tenders/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId: tender.id,
          bidId: bid.id,
          companyId: bid.company_id,
          departmentId: tender.department_id,
          contractAmount: bid.bid_amount
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to award contract');

      // Send notification to Company Admin
      try {
        const { sendSystemNotification } = await import('@/lib/client-actions/notifications');
        await sendSystemNotification({
          userId: bid.company_id,
          title: '🎉 Contract Awarded!',
          body: `Congratulations! Your bid for "${tender.title}" (${tender.tender_number}) was selected and awarded.`,
          type: 'status_updated',
          tenderId: tender.id
        });
      } catch (notifErr) {
        console.error('Failed to dispatch notification:', notifErr);
      }

      setTender(prev => prev ? { ...prev, status: 'Awarded' } : null);
      setBids(prev => prev.map(b => b.id === bid.id ? { ...b, status: 'Selected' } : { ...b, status: 'Rejected' }));
      setToast(`Contract successfully awarded to Company! Status updated to Awarded.`);
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      alert("Failed to award contract: " + err.message);
    } finally {
      setAwardingId(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#0ea5e9] animate-spin" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] text-white p-8 font-['Inter'] flex flex-col items-center justify-center">
        <FileText className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Published Tenders Available</h2>
        <p className="text-white/40 text-sm mb-6">Create a tender first before running AI evaluations.</p>
        <Link href="/department/tenders" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#8b5cf6] font-bold text-xs uppercase tracking-wider">
          Publish / Manage Tenders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white p-6 font-['Inter']">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <Link href="/department/tenders" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-4">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Tenders
          </Link>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black tracking-tight">Evaluate Bids: {tender.tender_number}</h1>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase border ${
                  tender.status === 'Awarded' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {tender.status}
                </span>
              </div>
              <p className="text-white/50">{tender.title} • Estimated Budget: ${tender.estimated_budget?.toLocaleString()}</p>
            </div>

            {/* Dropdown to switch tender */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white/50">Select Tender:</label>
              <select
                value={tender.id}
                onChange={(e) => router.push(`/admin/tenders/evaluate?tender_id=${e.target.value}`)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
              >
                {allTenders.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#121215] text-white">
                    {t.tender_number} - {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {toast && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
            {toast}
          </div>
        )}

        {/* Weights Info */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Price', val: '35%', color: '#0ea5e9' },
            { label: 'Technical', val: '20%', color: '#8b5cf6' },
            { label: 'Citizen Rating', val: '15%', color: '#10b981' },
            { label: 'Dept Rating', val: '15%', color: '#f59e0b' },
            { label: 'Penalties', val: '-15%', color: '#ef4444' },
          ].map(w => (
            <div key={w.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/30 font-bold mb-1">{w.label}</div>
              <div className="text-xl font-black" style={{ color: w.color }}>{w.val}</div>
            </div>
          ))}
        </div>

        {/* Bids List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white/80">Submitted Contractor Bids ({bids.length})</h2>

          {bids.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/[0.05]">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-semibold">No bids submitted yet for tender {tender.tender_number}.</p>
            </div>
          ) : (
            bids.map((bid) => (
              <div 
                key={bid.id} 
                className={`p-6 rounded-3xl border transition-all ${
                  bid.recommended 
                    ? 'bg-gradient-to-r from-[#0ea5e9]/10 via-white/[0.02] to-purple-500/10 border-[#0ea5e9]/40' 
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-white">Company ID: {bid.company_id.slice(0, 8)}</span>
                      {bid.recommended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                          <Award className="w-3 h-3" /> Recommended Winner
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        bid.status === 'Selected' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        bid.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-white/5 text-white/50 border-white/10'
                      }`}>
                        {bid.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-white/60 pt-1">
                      <div>Quoted Price: <strong className="text-emerald-400 font-bold">${bid.bid_amount?.toLocaleString()}</strong></div>
                      <div>Completion Time: <strong className="text-amber-400 font-bold">{bid.estimated_completion_days} Days</strong></div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">AI Rating Score</div>
                      <div className="text-2xl font-black text-[#0ea5e9]">{bid.ai_score?.toFixed(1)} / 100</div>
                    </div>

                    {tender.status !== 'Awarded' && (
                      <button
                        onClick={() => handleAwardContract(bid)}
                        disabled={awardingId === bid.id}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs uppercase tracking-wider border border-emerald-400/30 hover:opacity-90 transition-opacity"
                      >
                        {awardingId === bid.id ? 'Awarding Contract...' : 'Award Contract'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default function TenderEvaluationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d0f]" />}>
      <TenderEvaluationContent />
    </Suspense>
  );
}
