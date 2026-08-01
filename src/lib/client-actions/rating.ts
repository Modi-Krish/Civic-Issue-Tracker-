import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export async function checkRatingEligibility(issueId: string, citizenLat: number, citizenLng: number) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  // In Firestore, without the PostGIS RPC, we'll assume the citizen is eligible
  // if they are authenticated and haven't already reviewed this issue.
  
  // Check if they already reviewed
  const q = query(
    collection(db, 'company_reviews'), 
    where('issue_id', '==', issueId), 
    where('citizen_id', '==', user.uid)
  );
  
  const snap = await getDocs(q);

  if (!snap.empty) {
    return { isEligible: false, reason: 'Already rated' };
  }

  return { isEligible: true };
}

export async function submitCitizenRating(formData: FormData) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  const issueId = formData.get('issueId') as string;
  const companyId = formData.get('companyId') as string;
  const rating = parseInt(formData.get('rating') as string);
  const review = formData.get('review') as string;
  const citizenLat = parseFloat(formData.get('citizenLat') as string);
  const citizenLng = parseFloat(formData.get('citizenLng') as string);

  // Re-verify eligibility
  const { isEligible } = await checkRatingEligibility(issueId, citizenLat, citizenLng);

  if (!isEligible) {
    return { error: 'Not eligible to rate this issue.' };
  }

  try {
    await addDoc(collection(db, 'company_reviews'), {
      company_id: companyId,
      issue_id: issueId,
      citizen_id: user.uid,
      rating,
      review,
      created_at: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error submitting rating:", error);
    return { error: error.message };
  }
}
