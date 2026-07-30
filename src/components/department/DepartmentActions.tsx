'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update issue
    await supabase
      .from('issues')
      .update({
        assigned_employee_id: selectedEmployee,
        status: 'EMPLOYEE_ASSIGNED',
      })
      .eq('id', issue.id);

    // Log status change
    await supabase.from('issue_status_logs').insert({
      issue_id: issue.id,
      from_status: issue.status,
      to_status: 'EMPLOYEE_ASSIGNED',
      changed_by: user.id,
      comment: 'Employee assigned by department admin',
    });

    // Create assignment record
    await supabase.from('issue_assignments').insert({
      issue_id: issue.id,
      assigned_employee_id: selectedEmployee,
      assigned_by: user.id,
    });

    // Notify employee
    await supabase.from('notifications').insert({
      user_id: selectedEmployee,
      issue_id: issue.id,
      type: 'issue_assigned',
      title: 'New Task Assigned',
      body: `You have been assigned to: ${issue.title}`,
    });

    setLoading(false);
    router.refresh();
  }

  async function handleReview(decision: 'APPROVED' | 'REJECTED') {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (decision === 'APPROVED') {
      // Approve → Close
      await supabase
        .from('issues')
        .update({ status: 'CLOSED', closed_at: new Date().toISOString(), is_genuine: true })
        .eq('id', issue.id);

      await supabase.from('issue_status_logs').insert([
        { issue_id: issue.id, from_status: 'SUBMITTED_FOR_APPROVAL', to_status: 'APPROVED', changed_by: user.id, comment: 'Repair approved' },
        { issue_id: issue.id, from_status: 'APPROVED', to_status: 'CLOSED', changed_by: user.id, comment: 'Issue closed' },
      ]);

      // Credit reward to citizen
      await supabase.from('rewards').insert({
        user_id: issue.reporter_id,
        issue_id: issue.id,
        points: 10,
        reason: 'Issue resolved successfully',
      });

      // Notify citizen
      await supabase.from('notifications').insert({
        user_id: issue.reporter_id,
        issue_id: issue.id,
        type: 'repair_approved',
        title: 'Issue Resolved! 🎉',
        body: `Your issue "${issue.title}" has been resolved. You earned 10 reward points!`,
      });
    } else {
      // Reject
      await supabase
        .from('issues')
        .update({ status: 'REJECTED' })
        .eq('id', issue.id);

      await supabase.from('issue_status_logs').insert({
        issue_id: issue.id,
        from_status: 'SUBMITTED_FOR_APPROVAL',
        to_status: 'REJECTED',
        changed_by: user.id,
        comment: 'Repair rejected — rework required',
      });

      // Notify employee
      if (issue.assigned_employee_id) {
        await supabase.from('notifications').insert({
          user_id: issue.assigned_employee_id,
          issue_id: issue.id,
          type: 'repair_rejected',
          title: 'Repair Rejected',
          body: `Your repair for "${issue.title}" was rejected. Please rework and resubmit.`,
        });
      }
    }

    setLoading(false);
    router.refresh();
  }

  // Show assign UI if issue needs assignment
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
