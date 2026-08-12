import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

// Publish a new tender (Government Officer)
export async function publishTender(formData: FormData) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  const departmentId = formData.get('departmentId') as string;
  const areaId = formData.get('areaId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const estimatedBudget = parseFloat(formData.get('estimatedBudget') as string);
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;

  try {
    const tenderRef = await addDoc(collection(db, 'tenders'), {
      department_id: departmentId,
      area_id: areaId,
      title,
      description,
      estimated_budget: estimatedBudget,
      start_date: startDate,
      end_date: endDate,
      status: 'OPEN',
      created_at: serverTimestamp()
    });

    return { success: true, tenderId: tenderRef.id };
  } catch (error: any) {
    console.error("Error publishing tender:", error);
    return { error: error.message };
  }
}

// Submit a bid (Company Admin)
export async function submitBid(formData: FormData) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  const tenderId = formData.get('tenderId') as string;
  const quotedPrice = parseFloat(formData.get('quotedPrice') as string);
  const completionDays = parseInt(formData.get('completionDays') as string);
  const proposalDocument = formData.get('proposalDocument') as string;

  try {
    // Get the company id for this user
    const q = query(collection(db, 'company_employees'), where('profile_id', '==', user.uid));
    const empSnap = await getDocs(q);

    if (empSnap.empty) return { error: 'You do not belong to a company.' };
    const companyEmployee = empSnap.docs[0].data();

    await addDoc(collection(db, 'tender_bids'), {
      tender_id: tenderId,
      company_id: companyEmployee.company_id,
      quoted_price: quotedPrice,
      completion_days: completionDays,
      proposal_document: proposalDocument,
      status: 'PENDING',
      created_at: serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting bid:", error);
    return { error: error.message };
  }
}

// Evaluate bids for a tender using weighted formula
export async function evaluateTenderBids(tenderId: string) {
  try {
    const bidsQuery = query(collection(db, 'tender_bids'), where('tender_id', '==', tenderId), where('status', '==', 'PENDING'));
    const bidsSnap = await getDocs(bidsQuery);

    if (bidsSnap.empty) return { success: true, evaluated: false };

    const bids = bidsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const tenderRef = doc(db, 'tenders', tenderId);
    const tenderSnap = await getDoc(tenderRef);
    const estimatedBudget = tenderSnap.exists() ? tenderSnap.data().estimated_budget : 0;

    for (const bid of bids) {
      const compRef = doc(db, 'companies', (bid as any).company_id as string);
      const compSnap = await getDoc(compRef);
      const comp = compSnap.exists() ? compSnap.data() : { rating: 0, completed_projects: 0 };
      (bid as any).companies = { ...comp, id: (bid as any).company_id };

      const ratingScore = ((comp.rating || 0) / 5) * 100;
      const govRatingScore = ratingScore * 0.9;
      const slaScore = 90;
      const pastContractsScore = Math.min(((comp.completed_projects || 0) * 10), 100);

      let priceScore = 50;
      if (estimatedBudget > 0) {
        const ratio = ((bid as any).quoted_price as number) / estimatedBudget;
        if (ratio <= 1.0 && ratio > 0.5) priceScore = 100 - ((1 - ratio) * 50);
        else if (ratio > 1.0) priceScore = Math.max(0, 100 - ((ratio - 1) * 100));
        else priceScore = 40;
      }

      const finalScore =
        (ratingScore * 0.35) +
        (govRatingScore * 0.25) +
        (slaScore * 0.20) +
        (pastContractsScore * 0.10) +
        (priceScore * 0.10);

      (bid as any).ai_score = finalScore.toFixed(2);
    }

    const rankedBids = bids.sort((a: any, b: any) => parseFloat(b.ai_score) - parseFloat(a.ai_score));

    return { success: true, rankedBids };
  } catch (error: any) {
    console.error("Error evaluating bids:", error);
    return { error: error.message };
  }
}

// Award Contract (Government Officer)
export async function awardContract(tenderId: string, bidId: string, companyId: string, contractAmount: number) {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  try {
    const tenderRef = doc(db, 'tenders', tenderId);
    const tenderSnap = await getDoc(tenderRef);
    if (!tenderSnap.exists()) return { error: 'Tender not found' };
    const tender = tenderSnap.data();

    const batch = writeBatch(db);

    // Update Tender status
    batch.update(tenderRef, { status: 'AWARDED' });

    // Update Bid statuses
    const bidsQuery = query(collection(db, 'tender_bids'), where('tender_id', '==', tenderId));
    const bidsSnap = await getDocs(bidsQuery);
    
    bidsSnap.forEach(b => {
      const bRef = doc(db, 'tender_bids', b.id);
      if (b.id === bidId) {
        batch.update(bRef, { status: 'SELECTED' });
      } else {
        batch.update(bRef, { status: 'REJECTED' });
      }
    });

    // Create Contract
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const contractRef = doc(collection(db, 'contracts'));
    batch.set(contractRef, {
      company_id: companyId,
      department_id: tender.department_id,
      area_id: tender.area_id,
      tender_id: tenderId,
      contract_amount: contractAmount,
      contract_start: startDate.toISOString(),
      contract_end: endDate.toISOString(),
      status: 'ACTIVE',
      created_at: serverTimestamp()
    });

    // Auto-assign all pending department issues to winning contractor
    try {
      const deptId = String(tender.department_id || '').toLowerCase();
      const issuesQuery = query(collection(db, 'issues'));
      const issuesSnap = await getDocs(issuesQuery);
      
      issuesSnap.forEach(docSnap => {
        const data = docSnap.data();
        const issueDept = String(data.department_id || '').toLowerCase();
        const issueStatus = data.status;

        const isMatchDept = (deptId && (issueDept === deptId || issueDept.includes(deptId) || deptId.includes(issueDept)));
        const isPendingStatus = issueStatus === 'REPORTED' || issueStatus === 'DEPARTMENT_ASSIGNED' || !data.company_id;
        const isFinished = issueStatus === 'CLOSED' || issueStatus === 'APPROVED' || issueStatus === 'REJECTED';

        if (isMatchDept && isPendingStatus && !isFinished) {
          const issueRef = doc(db, 'issues', docSnap.id);
          batch.update(issueRef, {
            company_id: companyId,
            status: 'COMPANY_ASSIGNED',
            updated_at: new Date().toISOString()
          });

          const logRef = doc(collection(db, 'issue_status_logs'));
          batch.set(logRef, {
            issue_id: docSnap.id,
            to_status: 'COMPANY_ASSIGNED',
            changed_by: 'SYSTEM_TENDER_AWARD',
            comment: `Auto-assigned to winning Contractor (Contract #${contractRef.id.slice(0, 8)})`,
            created_at: new Date().toISOString()
          });
        }
      });
    } catch (routeErr) {
      console.warn("Client award auto-routing warning:", routeErr);
    }

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error awarding contract:", error);
    return { error: error.message };
  }
}
