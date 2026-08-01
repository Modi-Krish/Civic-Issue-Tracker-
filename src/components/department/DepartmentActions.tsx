'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Issue, Profile } from '@/lib/types/database';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  issue: Issue;
  employees: Pick<Profile, 'id' | 'full_name'>[];
}

export default function DepartmentActions({ issue, employees }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  async function handleAssign() {
    if (!selectedEmployee) return;
    setLoading(true);
    
    try {
      const { auth, db } = await import('@/lib/firebase');
      const { doc, updateDoc, collection, addDoc } = await import('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) return;

      const issueRef = doc(db, 'issues', issue.id);
      
      // Update issue
      await updateDoc(issueRef, {
        assigned_employee_id: selectedEmployee,
        status: 'EMPLOYEE_ASSIGNED',
      });

      // Log status change
      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: issue.id,
        from_status: issue.status,
        to_status: 'EMPLOYEE_ASSIGNED',
        changed_by: user.uid,
        comment: 'Employee assigned by department admin',
        created_at: new Date().toISOString()
      });

      // Create assignment record
      await addDoc(collection(db, 'issue_assignments'), {
        issue_id: issue.id,
        assigned_employee_id: selectedEmployee,
        assigned_by: user.uid,
        created_at: new Date().toISOString()
      });

      // Notify employee
      await addDoc(collection(db, 'notifications'), {
        user_id: selectedEmployee,
        issue_id: issue.id,
        type: 'issue_assigned',
        title: 'New Task Assigned',
        body: `You have been assigned to: ${issue.title}`,
        is_read: false,
        created_at: new Date().toISOString()
      });

      router.refresh();
    } catch (error) {
      console.error("Error assigning employee:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(decision: 'APPROVED' | 'REJECTED') {
    setLoading(true);
    
    try {
      const { auth, db } = await import('@/lib/firebase');
      const { doc, updateDoc, collection, addDoc, writeBatch } = await import('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) return;

      const issueRef = doc(db, 'issues', issue.id);
      
      if (decision === 'APPROVED') {
        const batch = writeBatch(db);
        
        batch.update(issueRef, { status: 'CLOSED', closed_at: new Date().toISOString(), is_genuine: true });

        const logRef1 = doc(collection(db, 'issue_status_logs'));
        batch.set(logRef1, {
          issue_id: issue.id, from_status: 'SUBMITTED_FOR_APPROVAL', to_status: 'APPROVED', changed_by: user.uid, comment: 'Repair approved', created_at: new Date().toISOString()
        });

        const logRef2 = doc(collection(db, 'issue_status_logs'));
        batch.set(logRef2, {
          issue_id: issue.id, from_status: 'APPROVED', to_status: 'CLOSED', changed_by: user.uid, comment: 'Issue closed', created_at: new Date(Date.now() + 1000).toISOString()
        });
        
        if (issue.reporter_id) {
          const rewardRef = doc(collection(db, 'rewards'));
          batch.set(rewardRef, {
            user_id: issue.reporter_id,
            issue_id: issue.id,
            points: 10,
            reason: 'Issue resolved successfully',
            created_at: new Date().toISOString()
          });
          
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            user_id: issue.reporter_id,
            issue_id: issue.id,
            type: 'repair_approved',
            title: 'Issue Resolved! 🎉',
            body: `Your issue "${issue.title}" has been resolved. You earned 10 reward points!`,
            is_read: false,
            created_at: new Date().toISOString()
          });
        }

        await batch.commit();

      } else {
        const batch = writeBatch(db);
        
        batch.update(issueRef, { status: 'REJECTED' });

        const logRef = doc(collection(db, 'issue_status_logs'));
        batch.set(logRef, {
          issue_id: issue.id,
          from_status: 'SUBMITTED_FOR_APPROVAL',
          to_status: 'REJECTED',
          changed_by: user.uid,
          comment: 'Repair rejected — rework required',
          created_at: new Date().toISOString()
        });
        
        if (issue.assigned_employee_id) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            user_id: issue.assigned_employee_id,
            issue_id: issue.id,
            type: 'repair_rejected',
            title: 'Repair Rejected',
            body: `Your repair for "${issue.title}" was rejected. Please rework and resubmit.`,
            is_read: false,
            created_at: new Date().toISOString()
          });
        }
        
        await batch.commit();
      }

      router.refresh();
    } catch (error) {
      console.error("Error reviewing repair:", error);
    } finally {
      setLoading(false);
    }
  }

  // If issue is assigned/routed to an outsourced company
  if (issue.company_id || issue.status === 'COMPANY_ASSIGNED' || issue.status === 'COMPANY_EMPLOYEE_ASSIGNED') {
    return (
      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', color: '#0ea5e9' }}>
        🏛️ Handled by Outsourced Contractor (Tender Managed)
      </div>
    );
  }

  // Show assign UI if issue needs assignment internally
  if (issue.status === 'REPORTED' || issue.status === 'DEPARTMENT_ASSIGNED') {
    return (
      <div className="flex items-center gap-2 mt-3">
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm border text-white cursor-pointer"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <option value="">Select employee...</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={loading || !selectedEmployee}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          style={{ background: 'var(--primary)' }}
        >
          <UserPlus className="w-4 h-4" />
          Assign
        </button>
      </div>
    );
  }

  // Show approve/reject if submitted for approval
  if (issue.status === 'SUBMITTED_FOR_APPROVAL') {
    return (
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => handleReview('APPROVED')}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          style={{ background: 'var(--success)' }}
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={() => handleReview('REJECTED')}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          style={{ background: 'var(--danger)' }}
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    );
  }

  return null;
}
