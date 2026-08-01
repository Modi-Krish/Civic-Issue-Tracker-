import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/lib/firebase/admin';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuthInstance();
    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const userRole = decodedToken.role || 'citizen'; // Assuming role might be set in custom claims

    // 2. Parse Request Body
    const body = await req.json();
    const { issueId, cityId } = body;

    if (!issueId) {
      return NextResponse.json({ error: 'Missing issueId' }, { status: 400 });
    }

    // 3. Ownership Verification via Firestore
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Firestore Admin not initialized' }, { status: 500 });
    }

    const issueRef = db.collection('issues').doc(issueId);
    const issueSnap = await issueRef.get();

    if (!issueSnap.exists) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const issueData = issueSnap.data();
    
    // Check if user is owner, department admin, or super admin
    const isOwner = issueData?.reporter_id === userId || issueData?.createdBy === userId;
    const isAdmin = ['department_admin', 'super_admin'].includes(userRole);

    if (!isOwner && !isAdmin) {
      console.warn(`[SECURITY] User ${userId} attempted to delete issue image ${issueId} without permission.`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this image' }, { status: 403 });
    }

    // Extract storage path
    const storagePath = issueData?.image?.path || issueData?.storagePath;
    if (!storagePath) {
      return NextResponse.json({ error: 'No image associated with this issue' }, { status: 404 });
    }

    // 4. Delete from Supabase Storage
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from('issues')
      .remove([storagePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      // We don't fail the request completely if the image was already gone, but log it
      console.log(`[STORAGE_WARN] Failed to delete image ${storagePath} from Supabase, ignoring.`);
    }

    // 5. Audit Log
    console.log(`[STORAGE_AUDIT] User ${userId} deleted image ${storagePath} for issue ${issueId}.`);

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });

  } catch (err: any) {
    console.error('Delete route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
