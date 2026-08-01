import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

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
    
    // In our empty NoSQL setup, we'll default to a placeholder department if it doesn't exist yet
    const deptId = deptSnap.empty ? 'default_dept' : deptSnap.docs[0].id;

    // 2. Area Detection
    // For Firestore without PostGIS, we'll just set it to null or a default area
    const areaId = null;
    let assignedCompanyId = null;
    let status = 'REPORTED';

    // 4. Create Issue
    const issueRef = await addDoc(collection(db, 'issues'), {
      reporter_id: user.uid,
      department_id: deptId,
      area_id: areaId,
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
      comment: 'Auto-routed via NoSQL basic routing',
      created_at: serverTimestamp()
    });

    return { success: true, issueId: issueRef.id };
  } catch (error: any) {
    console.error("Error submitting issue:", error);
    return { error: error.message };
  }
}
