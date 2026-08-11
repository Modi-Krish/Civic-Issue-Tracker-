import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { supabase } from '@/lib/supabase/client';
import { sendSystemNotification } from '@/lib/client-actions/notifications';

export interface SubmitIssuePayload {
  title: string;
  description: string;
  issueType?: string;
  category?: string;
  deptSlug?: string;
  locationLat?: number | string;
  locationLng?: number | string;
  lat?: number | string;
  lng?: number | string;
  locationLabel?: string;
  filePath?: string;
  originalLanguage?: string;
  originalText?: string;
  translatedText?: string;
  preferredLanguage?: string;
  aiExtractedInfo?: unknown;
  aiPriority?: string;
  finalPriority?: string;
  priorityReason?: string;
}

function generateComplaintNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GRV-${year}-VAD-${rand}`;
}

export async function logStatusAndNotify(
  db: any,
  issueId: string,
  reporterId: string | null | undefined,
  fromStatus: string,
  toStatus: string,
  changedBy: string,
  comment: string | null
) {
  const { doc, collection, writeBatch } = await import('firebase/firestore');
  const batch = writeBatch(db);

  const logRef = doc(collection(db, 'issue_status_logs'));
  batch.set(logRef, {
    issue_id: issueId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: changedBy,
    comment: comment,
    created_at: new Date().toISOString()
  });

  if (reporterId) {
    const notifRef = doc(collection(db, 'notifications'));
    const notifBody = toStatus === 'CLOSED' 
      ? 'Your report has been resolved! You earned 2 reward points.' 
      : `Your report status changed to ${toStatus.replace(/_/g, ' ')}.`;
    
    batch.set(notifRef, {
      userId: reporterId,
      user_id: reporterId,
      issue_id: issueId,
      type: 'status_updated',
      title: 'Report Update',
      body: notifBody,
      message: notifBody,
      is_read: false,
      created_at: new Date().toISOString()
    });
  }

  if (toStatus === 'CLOSED' || toStatus === 'VERIFIED') {
    if (reporterId) {
       const rewardRef = doc(collection(db, 'rewards'));
       batch.set(rewardRef, {
         user_id: reporterId,
         issue_id: issueId,
         points: 2,
         reason: 'Report resolved successfully',
         created_at: new Date().toISOString()
       });
    }
  }

  await batch.commit();
}

export async function submitIssue(input: FormData | SubmitIssuePayload) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  let title: string;
  let description: string;
  let issueType: string;
  let deptSlug: string;
  let locationLat: number;
  let locationLng: number;
  let locationLabel: string;
  let filePath: string;
  
  // AI fields
  let originalLanguage = 'en';
  let originalText = '';
  let translatedText = '';
  let preferredLanguage = 'en';
  let aiExtractedInfo: unknown = null;
  let aiPriority = 'MEDIUM';
  let finalPriority = 'MEDIUM';
  let priorityReason = 'Default assignment';

  if (input instanceof FormData) {
    title = input.get('title') as string;
    description = input.get('description') as string;
    issueType = input.get('issueType') as string;
    deptSlug = input.get('deptSlug') as string;
    locationLat = parseFloat(input.get('locationLat') as string || '0');
    locationLng = parseFloat(input.get('locationLng') as string || '0');
    locationLabel = input.get('locationLabel') as string || '';
    filePath = input.get('filePath') as string || '';
    
    originalText = description;
    translatedText = description;
  } else {
    title = input.title;
    description = input.description;
    issueType = input.issueType || input.category || 'Other';
    deptSlug = input.deptSlug || 'sanitation';
    locationLat = parseFloat(String(input.locationLat || input.lat || '0'));
    locationLng = parseFloat(String(input.locationLng || input.lng || '0'));
    locationLabel = input.locationLabel || '';
    filePath = input.filePath || '';
    
    originalLanguage = input.originalLanguage || 'en';
    originalText = input.originalText || description;
    translatedText = input.translatedText || description;
    preferredLanguage = input.preferredLanguage || 'en';
    aiExtractedInfo = input.aiExtractedInfo || null;
    aiPriority = input.aiPriority || 'MEDIUM';
    finalPriority = input.finalPriority || 'MEDIUM';
    priorityReason = input.priorityReason || 'AI determined priority';
  }

  const complaintNumber = generateComplaintNumber();

  try {
    // 1. Department Detection
    const deptQuery = query(collection(db, 'departments'), where('slug', '==', deptSlug));
    const deptSnap = await getDocs(deptQuery);
    
    let deptId = 'default_dept';
    let managementMode = 'DEPARTMENT';

    if (!deptSnap.empty) {
      const deptDoc = deptSnap.docs[0];
      deptId = deptDoc.id;
      managementMode = deptDoc.data().management_mode || 'DEPARTMENT';
    }

    // 2. Routing & Workload-Aware Auto Assignment
    let assignedCompanyId: string | null = null;
    let assignedEmployeeId: string | null = null;
    let status = 'REPORTED';
    let routingComment = 'Auto-routed to Department Officer';

    if (managementMode === 'TENDER') {
      try {
        const res = await fetch(`/api/contracts/active?dept_slug=${deptSlug}&dept_id=${deptId}`);
        const data = await res.json();

        if (data?.contract) {
          const activeContract = data.contract;
          assignedCompanyId = activeContract.company_id;
          status = 'COMPANY_ASSIGNED';
          routingComment = `Auto-routed to Active Contractor (Contract #${activeContract.id.slice(0, 8)})`;
        } else {
          status = 'DEPARTMENT_ASSIGNED';
          routingComment = 'Tender Mode: Awaiting Active Contractor Award.';
        }
      } catch (err) {
        console.error("Contract routing lookup error:", err);
        status = 'DEPARTMENT_ASSIGNED';
        routingComment = 'Tender Mode: Routing error fallback to Department.';
      }
    } else {
      // In-house mode: Auto-assign employee with lowest workload
      status = 'DEPARTMENT_ASSIGNED';
      try {
        const qEmp = query(
          collection(db, 'profiles'), 
          where('department_id', '==', deptId), 
          where('role', '==', 'employee')
        );
        const empSnap = await getDocs(qEmp);
        if (!empSnap.empty) {
          const employees = empSnap.docs.map(d => ({ id: d.id, full_name: d.data().full_name }));
          const employeeIds = employees.map(e => e.id);
          
          // Query current active workloads
          const qIssues = query(
            collection(db, 'issues'),
            where('assigned_employee_id', 'in', employeeIds)
          );
          const issuesSnap = await getDocs(qIssues);
          const workloads: Record<string, number> = {};
          employeeIds.forEach(id => { workloads[id] = 0; });
          
          issuesSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.status !== 'CLOSED' && data.status !== 'APPROVED' && data.status !== 'REJECTED') {
              if (data.assigned_employee_id) {
                workloads[data.assigned_employee_id] = (workloads[data.assigned_employee_id] || 0) + 1;
              }
            }
          });

          // Find employee with minimum workload
          let bestEmpId = employeeIds[0];
          let minWork = workloads[bestEmpId];
          employees.forEach(emp => {
            if (workloads[emp.id] < minWork) {
              bestEmpId = emp.id;
              minWork = workloads[emp.id];
            }
          });

          assignedEmployeeId = bestEmpId;
          status = 'EMPLOYEE_ASSIGNED';
          const bestEmpName = employees.find(e => e.id === bestEmpId)?.full_name || 'Field Staff';
          routingComment = `Auto-assigned to Employee ${bestEmpName} (Workload: ${minWork} active tasks)`;
        }
      } catch (err) {
        console.warn("Workload assignment fallback:", err);
      }
    }

    // 3. Calculate SLA Deadlines from Supabase rules
    let targetResolutionHours = 72; // default 3 days
    try {
      const { data: rules } = await supabase
        .from('sla_rules')
        .select('target_resolution_hours')
        .eq('priority', finalPriority)
        .maybeSingle();
      if (rules?.target_resolution_hours) {
        targetResolutionHours = rules.target_resolution_hours;
      }
    } catch {
      const defaults = { CRITICAL: 4, HIGH: 24, MEDIUM: 72, LOW: 168 };
      targetResolutionHours = defaults[finalPriority as keyof typeof defaults] || 72;
    }
    const slaDeadline = new Date(Date.now() + targetResolutionHours * 3600 * 1000);

    // 4. Create Issue in Firestore
    const issueRef = await addDoc(collection(db, 'issues'), {
      complaint_number: complaintNumber,
      reporter_id: user.uid,
      department_id: deptId,
      company_id: assignedCompanyId,
      assigned_employee_id: assignedEmployeeId,
      issue_type: issueType,
      title,
      description,
      status,
      location_lat: locationLat,
      location_lng: locationLng,
      location_label: locationLabel || null,
      before_image_path: filePath,
      original_language: originalLanguage,
      original_text: originalText,
      translated_text: translatedText,
      preferred_language: preferredLanguage,
      ai_extracted_info: aiExtractedInfo,
      ai_priority: aiPriority,
      final_priority: finalPriority,
      priority_reason: priorityReason,
      priority_overridden: false,
      sla_deadline: slaDeadline.toISOString(),
      created_at: serverTimestamp()
    });

    // Log status change
    await addDoc(collection(db, 'issue_status_logs'), {
      issue_id: issueRef.id,
      to_status: status,
      changed_by: user.uid,
      comment: routingComment,
      created_at: serverTimestamp()
    });

    // Send Notification to Company Admin or Employee
    if (assignedCompanyId) {
      await sendSystemNotification({
        userId: assignedCompanyId,
        title: 'New Issue Auto-Routed to Your Company',
        body: `New civic issue "${title}" was automatically routed under your active contract.`,
        type: 'issue_assigned',
        issueId: issueRef.id
      });
    } else if (assignedEmployeeId) {
      await addDoc(collection(db, 'notifications'), {
        user_id: assignedEmployeeId,
        issue_id: issueRef.id,
        type: 'issue_assigned',
        title: 'New Task Auto-Assigned',
        body: `You have been automatically assigned: ${title}`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    return { success: true, issueId: issueRef.id, complaintNumber };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error submitting issue:", error);
    return { error: errMessage };
  }
}
