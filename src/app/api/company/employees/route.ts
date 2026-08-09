import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ employees: [] });
    }

    const snapshot = await db.collection('company_employees')
      .where('company_id', '==', companyId)
      .get();

    const employees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error("GET /api/company/employees exception:", error);
    return NextResponse.json({ employees: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, fullName, email, phone, designation } = body;

    if (!companyId || !fullName || !email) {
      return NextResponse.json({ error: 'Company ID, Full Name, and Email are required' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase Admin DB not initialized");
    }

    const { getAdminAuthInstance } = await import('@/lib/firebase/admin');
    const auth = getAdminAuthInstance();
    if (!auth) {
      throw new Error("Firebase Admin Auth not initialized");
    }

    const generatedPassword = crypto.randomBytes(8).toString('hex') + 'Emp@1';

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: generatedPassword,
        displayName: fullName,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'An account with this email already exists in the system.' }, { status: 400 });
      }
      throw err;
    }

    const newEmpRef = db.collection('company_employees').doc();
    
    // Create profile document so the user can successfully log in and get redirected
    await db.collection('profiles').doc(userRecord.uid).set({
      id: userRecord.uid,
      full_name: fullName,
      role: 'company_employee',
      department_id: null,
      email: email,
      created_at: new Date().toISOString()
    });
    
    const employeeData = {
      company_id: companyId,
      profile_id: userRecord.uid,
      full_name: fullName,
      email: email,
      phone: phone || '',
      designation: designation || 'Field Engineer',
      availability: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    await newEmpRef.set(employeeData);

    return NextResponse.json({ 
      success: true, 
      employee: { id: newEmpRef.id, ...employeeData },
      password: generatedPassword
    });
  } catch (error: any) {
    console.error("POST /api/company/employees exception:", error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, designation, availability, fullName } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase Admin DB not initialized");
    }

    const empRef = db.collection('company_employees').doc(employeeId);
    
    const updates: any = {};
    if (designation !== undefined) updates.designation = designation;
    if (availability !== undefined) updates.availability = availability;
    if (fullName !== undefined) updates.full_name = fullName;

    await empRef.update(updates);

    const updatedDoc = await empRef.get();

    return NextResponse.json({ success: true, employee: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    console.error("PATCH /api/company/employees exception:", error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
