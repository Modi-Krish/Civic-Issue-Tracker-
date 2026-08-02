'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle, AlertTriangle, ShieldCheck, DollarSign, Star, FileText, Award, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Tender, TenderBid, CompanyRating } from '@/lib/types/database';

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
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!tender) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, color: T.text1, padding: 32, fontFamily: "'Inter',-apple-system,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <FileText size={48} color={T.text3} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>No Published Tenders Available</h2>
        <p style={{ color: T.text3, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>Create a tender first before running AI evaluations.</p>
        <Link href="/department/tenders" style={{ padding: "12px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", textDecoration: "none", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
          Publish / Manage Tenders
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.base, color: T.text1, padding: "24px 16px", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        
        {/* Header */}
        <div>
          <Link href="/department/tenders" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text3, fontWeight: 700, textDecoration: "none", marginBottom: 16 }}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            Back to Tenders
          </Link>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: T.text1 }}>Evaluate Bids: {tender.tender_number}</h1>
                  <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", background: tender.status === 'Awarded' ? "#EEEDFE" : "#EAF3DE", color: tender.status === 'Awarded' ? "#3C3489" : "#27500A", boxShadow: SH.raisedSm }}>
                    {tender.status}
                  </span>
                </div>
                <p style={{ color: T.text3, fontSize: 14, margin: 0, fontWeight: 600 }}>{tender.title} • Estimated Budget: <strong style={{ color: T.text1 }}>${tender.estimated_budget?.toLocaleString()}</strong></p>
              </div>

              {/* Dropdown to switch tender */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text3 }}>Select Tender:</label>
                <select
                  value={tender.id}
                  onChange={(e) => router.push(`/admin/tenders/evaluate?tender_id=${e.target.value}`)}
                  style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: "10px 16px", fontSize: 12, fontWeight: 800, color: T.text1, outline: "none", boxShadow: SH.insetSoft, cursor: "pointer" }}
                >
                  {allTenders.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tender_number} - {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div style={{ padding: 16, borderRadius: 16, background: "#EAF3DE", border: "1px solid #27500A30", color: "#27500A", fontWeight: 800, fontSize: 14, boxShadow: SH.insetSoft }}>
            {toast}
          </div>
        )}

        {/* Weights Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          {[
            { label: 'Price', val: '35%', color: '#0C447C' },
            { label: 'Technical', val: '20%', color: '#3C3489' },
            { label: 'Citizen Rating', val: '15%', color: '#27500A' },
            { label: 'Dept Rating', val: '15%', color: '#854F0B' },
            { label: 'Penalties', val: '-15%', color: '#791F1F' },
          ].map(w => (
            <div key={w.label} style={{ padding: 16, borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, fontWeight: 900, marginBottom: 4 }}>{w.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: w.color, letterSpacing: "-0.02em" }}>{w.val}</div>
            </div>
          ))}
        </div>

        {/* Bids List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text1, margin: 0, letterSpacing: "-0.02em" }}>Submitted Contractor Bids ({bids.length})</h2>

          {bids.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", borderRadius: 24, background: T.base, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
              <FileText size={48} color={T.text3} style={{ margin: "0 auto 12px" }} />
              <p style={{ color: T.text3, fontSize: 14, fontWeight: 700, margin: 0 }}>No bids submitted yet for tender {tender.tender_number}.</p>
            </div>
          ) : (
            bids.map((bid) => (
              <div 
                key={bid.id} 
                style={{ 
                  padding: 24, borderRadius: 24, transition: "all 0.2s",
                  background: bid.recommended ? T.accentTint : T.base, 
                  border: bid.recommended ? "none" : `1px solid ${T.border}`,
                  boxShadow: bid.recommended ? SH.raised : SH.insetSoft
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: T.text1 }}>Company ID: {bid.company_id.slice(0, 8)}</span>
                      {bid.recommended && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: T.accentDark, background: "#E1F5EE", border: "1px solid #1D9E7530", padding: "4px 12px", borderRadius: 99, boxShadow: SH.raisedSm }}>
                          <Award size={12} /> Recommended Winner
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 99, 
                        background: bid.status === 'Selected' ? "#EEEDFE" : bid.status === 'Rejected' ? "#FCEBEB" : T.raised,
                        color: bid.status === 'Selected' ? "#3C3489" : bid.status === 'Rejected' ? "#791F1F" : T.text3,
                        border: bid.status === 'Selected' ? "none" : bid.status === 'Rejected' ? "none" : `1px solid ${T.border}`,
                        boxShadow: SH.raisedSm
                      }}>
                        {bid.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 14, color: T.text2, marginTop: 4, fontWeight: 700 }}>
                      <div>Quoted Price: <strong style={{ color: T.accentDark, fontSize: 16 }}>${bid.bid_amount?.toLocaleString()}</strong></div>
                      <div>Completion Time: <strong style={{ color: "#854F0B", fontSize: 16 }}>{bid.estimated_completion_days} Days</strong></div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                    <div style={{ padding: "12px 24px", borderRadius: 20, background: T.raised, border: `1px solid ${T.border}`, textAlign: "center", boxShadow: SH.raised }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text3, fontWeight: 900 }}>AI Rating Score</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#0C447C", letterSpacing: "-0.02em" }}>{bid.ai_score?.toFixed(1)} / 100</div>
                    </div>

                    {tender.status !== 'Awarded' && (
                      <button
                        onClick={() => handleAwardContract(bid)}
                        disabled={awardingId === bid.id}
                        style={{ padding: "12px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", border: "none", cursor: "pointer", boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}
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
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: T.base }} />}>
      <TenderEvaluationContent />
    </Suspense>
  );
}
