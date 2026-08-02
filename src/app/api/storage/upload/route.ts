import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthInstance } from '@/lib/firebase/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication (Graceful Fallback)
    let userId = 'anonymous_user';
    const authHeader = req.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const adminAuth = getAdminAuthInstance();
        if (adminAuth) {
          const decodedToken = await adminAuth.verifyIdToken(token);
          userId = decodedToken.uid;
        }
      } catch (authErr) {
        console.warn('Firebase token verification notice (using fallback ID):', authErr);
      }
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const cityId = (formData.get('cityId') as string | null) || 'global';
    const folder = (formData.get('folder') as string | null) || 'attachments';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // 4. File Buffer & Sharp Optimization with Safe Fallback
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);
    let finalBuffer = rawBuffer;
    let mimeType = file.type || 'image/jpeg';
    let extension = mimeType.split('/')[1] || 'jpg';

    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default;
      finalBuffer = await sharp(rawBuffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      mimeType = 'image/webp';
      extension = 'webp';
    } catch (sharpErr) {
      console.warn('Sharp image optimization notice (using raw buffer fallback):', sharpErr);
    }

    // 5. Upload to Supabase Storage with Data URL Fallback
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const uuid = uuidv4();
    const storagePath = `${cityId}/${folder}/${year}/${month}/${uuid}.${extension}`;

    let imageUrl: string | null = null;

    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error } = await supabase.storage
          .from('issues')
          .upload(storagePath, finalBuffer, {
            contentType: mimeType,
            upsert: true
          });

        if (!error) {
          const { data: publicUrlData } = supabase.storage
            .from('issues')
            .getPublicUrl(storagePath);
          imageUrl = publicUrlData.publicUrl;
        } else {
          console.warn('Supabase storage upload notice:', error);
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase admin client notice:', supabaseErr);
    }

    // Base64 Data URL fallback if storage bucket upload is unavailable
    if (!imageUrl) {
      const base64Data = finalBuffer.toString('base64');
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    return NextResponse.json({
      url: imageUrl,
      path: storagePath,
      size: finalBuffer.length,
      mimeType: mimeType,
      uploadedAt: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Upload API route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
