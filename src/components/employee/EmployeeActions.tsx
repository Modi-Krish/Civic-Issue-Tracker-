'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Issue } from '@/lib/types/database';
import { Play, Upload, Send } from 'lucide-react';
import Image from 'next/image';

interface Props {
  issue: Issue;
}

export default function EmployeeActions({ issue }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [repairImage, setRepairImage] = useState<File | null>(null);
  const [repairPreview, setRepairPreview] = useState<string | null>(null);

  async function handleStatusUpdate(newStatus: 'IN_PROGRESS') {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issue.id);

    await supabase.from('issue_status_logs').insert({
      issue_id: issue.id,
      from_status: issue.status,
      to_status: newStatus,
      changed_by: user.id,
      comment: newStatus === 'IN_PROGRESS' ? 'Work started by employee' : undefined,
    });

    setLoading(false);
    router.refresh();
  }

  async function handleSubmitRepair() {
    if (!repairImage) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upload repair image
    const fileExt = repairImage.name.split('.').pop();
    const filePath = `${user.id}/repair-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('issue-images')
      .upload(filePath, repairImage);

    if (uploadError) {
      setLoading(false);
      return;
    }

    // Update issue
    await supabase
      .from('issues')
      .update({ status: 'SUBMITTED_FOR_APPROVAL', after_image_path: filePath })
      .eq('id', issue.id);

    await supabase.from('issue_status_logs').insert({
      issue_id: issue.id,
      from_status: issue.status,
      to_status: 'SUBMITTED_FOR_APPROVAL',
      changed_by: user.id,
      comment: 'Repair completed, submitted for approval',
    });

    // Notify department admins
    const { data: dept } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'department_admin')
      .eq('department_id', issue.department_id);

    if (dept) {
      for (const admin of dept) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          issue_id: issue.id,
          type: 'status_updated',
          title: 'Repair Submitted',
          body: `Employee submitted repair proof for "${issue.title}"`,
        });
      }
    }

    setLoading(false);
    router.refresh();
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setRepairImage(file);
      const reader = new FileReader();
      reader.onload = () => setRepairPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  // Show "Start Work" button
  if (issue.status === 'EMPLOYEE_ASSIGNED') {
    return (
      <button
        onClick={() => handleStatusUpdate('IN_PROGRESS')}
        disabled={loading}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        style={{ background: 'var(--primary)' }}
      >
        <Play className="w-4 h-4" />
        Start Work
      </button>
    );
  }

  // Show upload + submit for in-progress or rejected
  if (issue.status === 'IN_PROGRESS' || issue.status === 'REJECTED') {
    return (
      <div className="mt-3 space-y-2">
        {repairPreview && (
          <div className="rounded-xl overflow-hidden border relative h-32 w-full" style={{ borderColor: 'var(--border)' }}>
            <Image src={repairPreview} alt="Repair" fill unoptimized className="object-cover" />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 border cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            <Upload className="w-4 h-4" />
            {repairImage ? 'Change Photo' : 'Upload Proof'}
          </button>
          {repairImage && (
            <button
              onClick={handleSubmitRepair}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ background: 'var(--success)' }}
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
      </div>
    );
  }

  return null;
}
