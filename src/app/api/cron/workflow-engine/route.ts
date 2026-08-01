import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminDb } from '@/lib/firebase/admin';

// Protect cron route with a secret key in production
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = {
      communityReviewsProcessed: 0,
      slasProcessed: 0,
      penaltiesApplied: 0
    };

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // 1. Process Community Reviews
    // Fetch all issues in COMMUNITY_REVIEW status from Firestore
    const issuesSnapshot = await adminDb.collection('issues').where('status', '==', 'COMMUNITY_REVIEW').get();
    
    for (const doc of issuesSnapshot.docs) {
      const issue = doc.data();
      const issueId = doc.id;
      
      // Get reviews from Supabase
      const { data: reviews } = await supabase
        .from('community_reviews')
        .select('rating')
        .eq('issue_id', issueId);

      const reviewCount = reviews?.length || 0;
      
      // Determine time spent in COMMUNITY_REVIEW
      // For simplicity in MVP, we check when the issue was updated. Ideally, we query status logs.
      const lastUpdatedDate = issue.updated_at ? issue.updated_at.toDate() : new Date();
      const daysInReview = (new Date().getTime() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);

      let shouldClose = false;
      let averageRating = 0;

      if (reviewCount >= 10 || daysInReview >= 7) {
        shouldClose = true;
        if (reviewCount > 0) {
          averageRating = reviews!.reduce((acc, r) => acc + r.rating, 0) / reviewCount;
        } else {
          averageRating = 5; // Default positive if 7 days passed with no complaints
        }
      }

      if (shouldClose) {
        if (averageRating >= 2.5) {
          // Approved by community
          await adminDb.collection('issues').doc(issueId).update({
            status: 'VERIFIED',
            updated_at: new Date()
          });

          // Increase company score (simplified RPC logic we will create or assume exists)
          if (issue.company_id) {
            // Assume an RPC exists or we update manually here:
            const { data: currentRating } = await supabase.from('company_ratings').select('completed_issues, citizen_score').eq('company_id', issue.company_id).single();
            if (currentRating) {
               await supabase.from('company_ratings').update({
                 completed_issues: (currentRating.completed_issues || 0) + 1,
                 citizen_score: (currentRating.citizen_score || 0) * 0.9 + (averageRating * 0.1) // Moving average
               }).eq('company_id', issue.company_id);
            }
          }
        } else {
          // Rejected by community
          await adminDb.collection('issues').doc(issueId).update({
            status: 'COMMUNITY_REJECTED',
            updated_at: new Date()
          });

          // Apply penalty
          if (issue.company_id) {
            const { data: currentRating } = await supabase.from('company_ratings').select('rejected_issues, penalty_points').eq('company_id', issue.company_id).single();
            if (currentRating) {
              await supabase.from('company_ratings').update({
                rejected_issues: (currentRating.rejected_issues || 0) + 1,
                penalty_points: (currentRating.penalty_points || 0) + 10
              }).eq('company_id', issue.company_id);
            }
            results.penaltiesApplied++;
          }
        }
        results.communityReviewsProcessed++;
      }
    }

    // 2. Process SLAs (Placeholder structure for SLA Engine)
    // Fetch issues in IN_PROGRESS or EMPLOYEE_ASSIGNED
    const activeIssuesSnapshot = await adminDb.collection('issues')
      .where('status', 'in', ['EMPLOYEE_ASSIGNED', 'IN_PROGRESS'])
      .get();

    for (const doc of activeIssuesSnapshot.docs) {
      const issue = doc.data();
      if (!issue.company_id) continue;

      // In a real scenario, check issue.contract_id target_resolution_hours against issue.created_at
      // If elapsed > target_resolution_hours, apply penalty and notify.
      // (Implementation requires contract data fetch)
      results.slasProcessed++;
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
