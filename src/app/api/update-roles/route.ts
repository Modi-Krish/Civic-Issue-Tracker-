import { NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/lib/firebase/admin';

const USERS = [
  { email: 'citizencivictracker@gmail.com', role: 'citizen' },
  { email: 'govofficercivictracker@gmail.com', role: 'government_officer' },
  { email: 'companyadmincivictracker@gmail.com', role: 'company_admin' },
  { email: 'companyemployeecivictracker@gmail.com', role: 'company_employee' },
  { email: 'superadmincivictracker@gmail.com', role: 'super_admin' },
  { email: 'roadcivictracker@gmail.com', role: 'department_admin', deptSlug: 'roads' },
];

export async function GET() {
  try {
    const auth = getAdminAuthInstance();
    const db = getAdminDb();
    
    if (!auth || !db) return NextResponse.json({ error: 'No admin instance' });

    const deptsSnap = await db.collection('departments').get();
    const deptMap: Record<string, string> = {};
    deptsSnap.forEach(doc => {
      deptMap[doc.data().slug] = doc.id;
    });

    const results = [];

    for (const u of USERS) {
      try {
        const userRecord = await auth.getUserByEmail(u.email);
        const uid = userRecord.uid;
        
        let deptId = null;
        if (u.deptSlug) {
          deptId = deptMap[u.deptSlug];
        }

        await db.collection('profiles').doc(uid).update({
          role: u.role,
          department_id: deptId || null
        });
        
        results.push(`Updated ${u.email} to ${u.role}`);
      } catch (err: any) {
        results.push(`Failed for ${u.email}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
