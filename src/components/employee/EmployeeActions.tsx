'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Issue } from '@/lib/types/database';
import { Play, Upload, Send } from 'lucide-react';
import Image from 'next/image';
import { useImageUpload } from '@/hooks/useImageUpload';

interface Props {
  issue: Issue;
}

export default function EmployeeActions({ issue }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [repairImage, setRepairImage] = useState<File | null>(null);
  const [repairPreview, setRepairPreview] = useState<string | null>(null);
  const { uploadImage, isUploading } = useImageUpload({ cityId: 'vadodara', type: 'after' });

  async function handleStatusUpdate(newStatus: 'IN_PROGRESS') {
    setLoading(true);
    try {
      const { auth, db } = await import('@/lib/firebase');
      const user = auth.currentUser;
      if (!user) return;

      const { doc, updateDoc, collection, addDoc } = await import('firebase/firestore');
      
      const issueRef = doc(db, 'issues', issue.id);
      await updateDoc(issueRef, { status: newStatus });

      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: issue.id,
        from_status: issue.status,
        to_status: newStatus,
        changed_by: user.uid,
        comment: newStatus === 'IN_PROGRESS' ? 'Work started by employee' : null,
        created_at: new Date().toISOString()
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRepair() {
    if (!repairImage) return;
    setLoading(true);

    try {
      const { auth, db } = await import('@/lib/firebase');
      const { collection, doc, updateDoc, addDoc, getDocs, query, where } = await import('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) return;

      const imageMetadata = await uploadImage(repairImage);
      if (!imageMetadata) {
        throw new Error('Image upload failed.');
      }

      const issueRef = doc(db, 'issues', issue.id);
      await updateDoc(issueRef, { status: 'SUBMITTED_FOR_APPROVAL', after_image: imageMetadata });

      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: issue.id,
        from_status: issue.status,
        to_status: 'SUBMITTED_FOR_APPROVAL',
        changed_by: user.uid,
        comment: 'Repair completed, submitted for approval',
        created_at: new Date().toISOString()
      });

      // Notify department admins
      const qAdmins = query(collection(db, 'profiles'), where('role', '==', 'department_admin'), where('department_id', '==', issue.department_id));
      const adminsSnap = await getDocs(qAdmins);
      
      for (const admin of adminsSnap.docs) {
        await addDoc(collection(db, 'notifications'), {
          user_id: admin.id,
          issue_id: issue.id,
          type: 'status_updated',
          title: 'Repair Submitted',
          body: `Employee submitted repair proof for "${issue.title}"`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
      
      router.refresh();
    } catch (error) {
      console.error("Error submitting repair:", error);
    } finally {
      setLoading(false);
    }
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
              disabled={loading || isUploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ background: 'var(--success)' }}
            >
              <Send className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Submit'}
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
      </div>
    );
  }

  return null;
}
