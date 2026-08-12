'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { FileText, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

export default function CreateTenderPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    department_id: profile?.department_id || 'electricity',
    title: '',
    description: '',
    scope_of_work: '',
    tender_type: 'Open Tender',
    estimated_budget: '',
    emd_amount: '',
    contract_start_date: '',
    contract_end_date: '',
    bid_submission_deadline: ''
  });

  const [departments, setDepartments] = useState<Array<{ id: string; name: string; slug: string }>>([
    { id: 'electricity', slug: 'electricity', name: 'Electricity Department' }
  ]);

  useEffect(() => {
    async function loadTenderDepartments() {
      try {
        const tenderDepts: Array<{ id: string; name: string; slug: string }> = [];

        // 1. Fetch from Firestore (filtering for management_mode === 'TENDER')
        try {
          const { collection, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const snap = await getDocs(collection(db, 'departments'));
          if (!snap.empty) {
            snap.docs.forEach(doc => {
              const data = doc.data();
              if (data.management_mode === 'TENDER') {
                const slug = data.slug || doc.id;
                tenderDepts.push({
                  id: doc.id,
                  slug: slug,
                  name: data.name || slug
                });
              }
            });
          }
        } catch (e) {
          console.error("Firestore depts fetch error:", e);
        }

        // 2. Fetch from Supabase (filtering for management_mode === 'TENDER')
        try {
          const { data: supabaseDepts } = await supabase
            .from('departments')
            .select('id, name, slug, management_mode')
            .eq('management_mode', 'TENDER');

          if (supabaseDepts && supabaseDepts.length > 0) {
            supabaseDepts.forEach(d => {
              const slug = d.slug || d.id;
              if (!tenderDepts.some(existing => existing.slug.toLowerCase() === slug.toLowerCase())) {
                tenderDepts.push({
                  id: d.id || slug,
                  slug: slug,
                  name: d.name || slug
                });
              }
            });
          }
        } catch (e) {
          console.error("Supabase depts fetch error:", e);
        }

        if (tenderDepts.length > 0) {
          setDepartments(tenderDepts);
          if (!tenderDepts.some(d => d.slug.toLowerCase() === (formData.department_id || '').toLowerCase())) {
            setFormData(prev => ({ ...prev, department_id: tenderDepts[0].slug }));
          }
        }
      } catch (err) {
        console.error("Error loading tender departments:", err);
      }
    }
    loadTenderDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const deptId = formData.department_id || profile?.department_id;
    if (!deptId) {
      setErrorToast("Please select a releasing department.");
      return;
    }
    
    setIsSubmitting(true);
    setErrorToast(null);

    try {
      const tender_number = `TND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase.from('tenders').insert({
        id: uuidv4(),
        tender_number,
        department_id: deptId,
        title: formData.title,
        description: formData.description,
        scope_of_work: formData.scope_of_work,
        tender_type: formData.tender_type,
        estimated_budget: parseFloat(formData.estimated_budget) || 0,
        emd_amount: parseFloat(formData.emd_amount) || 0,
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        bid_submission_deadline: new Date(formData.bid_submission_deadline).toISOString(),
        status: 'Published' // Directly publishing for MVP
      });

      if (error) throw error;
      
      router.push('/department');
    } catch (err: any) {
      console.error("Error publishing tender:", err);
      setErrorToast(err.message || "An error occurred publishing the tender.");
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#0d0d0f]" />;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white p-6 font-['Inter'] pb-24">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <Link href="/department" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0ea5e9]/20 to-[#8b5cf6]/10 text-[#0ea5e9]">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Publish New Tender</h1>
          </div>
          <p className="text-white/50 text-sm ml-11">Open bidding to private contractors for civic infrastructure management.</p>
        </div>

        {errorToast && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex justify-between">
            {errorToast}
            <button onClick={() => setErrorToast(null)}>✕</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-6">
            
            <div className="space-y-4">
              <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">General Information</h2>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">Releasing Department</label>
                <select name="department_id" value={formData.department_id} onChange={handleChange}
                  className="w-full bg-[#151518] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9]/50 transition-colors">
                  {departments.map((dept) => (
                    <option key={dept.id || dept.slug} value={dept.slug || dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">Tender Title</label>
                <input required name="title" value={formData.title} onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors" 
                  placeholder="e.g. Annual Ward Streetlight Maintenance" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">Tender Type</label>
                  <select name="tender_type" value={formData.tender_type} onChange={handleChange}
                    className="w-full bg-[#151518] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9]/50 transition-colors">
                    <option>Open Tender</option>
                    <option>Limited Tender</option>
                    <option>Emergency Tender</option>
                    <option>Annual Maintenance Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">Bid Deadline</label>
                  <input required type="datetime-local" name="bid_submission_deadline" value={formData.bid_submission_deadline} onChange={handleChange}
                    className="w-full bg-[#151518] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9]/50 transition-colors" />
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="space-y-4">
              <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Financials & Timeline</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">Estimated Budget ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input required type="number" name="estimated_budget" value={formData.estimated_budget} onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#10b981]/50 transition-colors" 
                      placeholder="500000" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">EMD Amount (Deposit $)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input required type="number" name="emd_amount" value={formData.emd_amount} onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#10b981]/50 transition-colors" 
                      placeholder="10000" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">Contract Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input required type="date" name="contract_start_date" value={formData.contract_start_date} onChange={handleChange}
                      className="w-full bg-[#151518] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#8b5cf6]/50 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">Contract End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input required type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange}
                      className="w-full bg-[#151518] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#8b5cf6]/50 transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="space-y-4">
              <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Details</h2>
              
              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">Description</label>
                <textarea required rows={3} name="description" value={formData.description} onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors" 
                  placeholder="Provide a high level overview of the tender..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">Scope of Work</label>
                <textarea required rows={4} name="scope_of_work" value={formData.scope_of_work} onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors" 
                  placeholder="Detailed requirements, SLA expectations, material quality, etc..." />
              </div>
            </div>

          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#8b5cf6] text-white font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
            {isSubmitting ? 'PUBLISHING...' : 'PUBLISH TENDER'}
          </button>
        </form>

      </div>
    </div>
  );
}
