import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/lib/firebase/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
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
    const userRole = decodedToken.role || 'citizen';

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const issueId = formData.get('issueId') as string | null;
    const cityId = formData.get('cityId') as string | null || 'global';
    const folder = formData.get('folder') as string | null || 'before';

    if (!file || !issueId) {
      return NextResponse.json({ error: 'Missing file or issueId' }, { status: 400 });
    }

    // 3. Ownership Verification
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
    const isOwner = issueData?.reporter_id === userId || issueData?.createdBy === userId;
    const isAdmin = ['department_admin', 'super_admin'].includes(userRole);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this issue' }, { status: 403 });
    }

    // 4. Server-Side Validation & Optimization
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. SVG is explicitly rejected.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 5. Upload New Image to Supabase
    const supabase = getSupabaseAdmin();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const uuid = uuidv4();
    const storagePath = `${cityId}/${folder}/${year}/${month}/${uuid}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('issues')
      .upload(storagePath, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase replace upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload new image' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('issues')
      .getPublicUrl(storagePath);

    // 6. Delete Old Image
    const oldStoragePath = issueData?.image?.path || issueData?.storagePath;
    if (oldStoragePath) {
      const { error: deleteError } = await supabase.storage
        .from('issues')
        .remove([oldStoragePath]);
      
      if (deleteError) {
        console.warn(`[STORAGE_WARN] Failed to delete old image ${oldStoragePath} during replacement. Continuing.`);
      }
    }

    // 7. Return New Image Metadata
    console.log(`[STORAGE_AUDIT] User ${userId} replaced image for issue ${issueId}. New path: ${storagePath}`);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      path: storagePath,
      size: optimizedBuffer.length,
      mimeType: 'image/webp',
      uploadedAt: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Replace route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
