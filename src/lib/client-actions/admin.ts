import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function changeUserRole(targetUserId: string, newRole: string, departmentId?: string) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  try {
    // 1. Verify Caller is Super Admin
    const callerRef = doc(db, 'profiles', user.uid);
    const callerSnap = await getDoc(callerRef);
    
    if (!callerSnap.exists() || callerSnap.data().role !== 'super_admin') {
      return { error: 'Unauthorized. Only Super Admins can assign roles.' };
    }

    // 2. Update the target user's role and optionally department in profiles table
    const targetRef = doc(db, 'profiles', targetUserId);
    const updateData: any = { role: newRole };
    if (departmentId !== undefined) {
      updateData.department_id = departmentId || null;
    }
    
    await updateDoc(targetRef, updateData);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return { error: error.message };
  }
}

export async function reviewUser(targetUserId: string, action: 'APPROVE' | 'REJECT') {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  try {
    const callerRef = doc(db, 'profiles', user.uid);
    const callerSnap = await getDoc(callerRef);
    const callerProfile = callerSnap.exists() ? callerSnap.data() : null;

    // Fetch target user
    const targetRef = doc(db, 'profiles', targetUserId);
    const targetSnap = await getDoc(targetRef);
    
    if (!targetSnap.exists() || targetSnap.data().account_status !== 'PENDING') {
      return { error: 'User not found or not pending approval' };
    }

    const targetProfile = targetSnap.data();

    // Permission Check
    if (targetProfile.role === 'department_admin') {
      if (callerProfile?.role !== 'super_admin') {
        return { error: 'Only Super Admins can approve Department Admins' };
      }
    } else if (targetProfile.role === 'employee') {
      if (callerProfile?.role !== 'department_admin' && callerProfile?.role !== 'super_admin') {
        return { error: 'Only Department Admins or Super Admins can approve employees' };
      }
      if (callerProfile?.role === 'department_admin' && callerProfile.department_id !== targetProfile.department_id) {
        return { error: 'You can only approve employees in your own department' };
      }
    } else {
      return { error: 'Role does not require approval' };
    }

    // Process Action
    if (action === 'APPROVE') {
      await updateDoc(targetRef, { account_status: 'APPROVED' });
    } else if (action === 'REJECT') {
      await updateDoc(targetRef, { role: 'citizen', account_status: 'APPROVED' });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error reviewing user:", error);
    return { error: error.message };
  }
}
