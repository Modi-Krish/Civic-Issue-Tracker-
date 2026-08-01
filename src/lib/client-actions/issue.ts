import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { supabase } from '@/lib/supabase/client';
import { sendSystemNotification } from '@/lib/client-actions/notifications';

export async function submitIssue(formData: FormData) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const issueType = formData.get('issueType') as string;
  const deptSlug = formData.get('deptSlug') as string;
  const locationLat = parseFloat(formData.get('locationLat') as string);
  const locationLng = parseFloat(formData.get('locationLng') as string);
  const locationLabel = formData.get('locationLabel') as string;
  const filePath = formData.get('filePath') as string;

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

    // 2. Routing Engine (Contract Aware)
    let assignedCompanyId: string | null = null;
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
          // No active contract yet for this tender department
          status = 'DEPARTMENT_ASSIGNED';
          routingComment = 'Tender Mode: Awaiting Active Contractor Award.';
        }
      } catch (err: unknown) {
        console.error("Contract routing lookup error:", err);
        status = 'DEPARTMENT_ASSIGNED';
        routingComment = 'Tender Mode: Routing error fallback to Department.';
      }
    } else {
      status = 'DEPARTMENT_ASSIGNED';
    }

    // 3. Create Issue in Firestore
    const issueRef = await addDoc(collection(db, 'issues'), {
      reporter_id: user.uid,
      department_id: deptId,
      company_id: assignedCompanyId,
      issue_type: issueType,
      title,
      description,
      status,
      location_lat: locationLat,
      location_lng: locationLng,
      location_label: locationLabel || null,
      before_image_path: filePath,
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

    // Send Notification to Company Admin if routed to company
    if (assignedCompanyId) {
      await sendSystemNotification({
        userId: assignedCompanyId,
        title: 'New Issue Auto-Routed to Your Company',
        body: `New civic issue "${title}" was automatically routed under your active contract.`,
        type: 'issue_assigned',
        issueId: issueRef.id
      });
    }

    return { success: true, issueId: issueRef.id };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error submitting issue:", error);
    return { error: errMessage };
  }
}

