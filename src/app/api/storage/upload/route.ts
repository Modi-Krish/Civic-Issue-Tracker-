import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthInstance } from '@/lib/firebase/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// In-memory rate limiting map for demonstration (in production, use Redis)
const uploadRateLimits = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
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

    // 2. Rate Limiting
    const now = Date.now();
    const userLimit = uploadRateLimits.get(userId) || { count: 0, timestamp: now };
    if (now - userLimit.timestamp > RATE_LIMIT_WINDOW_MS) {
      userLimit.count = 1;
      userLimit.timestamp = now;
    } else {
      if (userLimit.count >= RATE_LIMIT_COUNT) {
        return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
      }
      userLimit.count += 1;
    }
    uploadRateLimits.set(userId, userLimit);

    // 3. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const cityId = formData.get('cityId') as string | null || 'global';
    const folder = formData.get('folder') as string | null || 'attachments';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 4. Server-Side Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. SVG is explicitly rejected.' }, { status: 400 });
    }

    // 5. Server-Side Optimization (Sharp)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 6. Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const uuid = uuidv4();
    const extension = 'webp';
    
    // Path structure: issues/<cityId>/<folder>/YYYY/MM/uuid.webp
    const storagePath = `${cityId}/${folder}/${year}/${month}/${uuid}.${extension}`;

    const { data, error } = await supabase.storage
      .from('issues')
      .upload(storagePath, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload image to storage' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('issues')
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;

    // 7. Audit Log (Console for now, could write to DB)
    console.log(`[STORAGE_AUDIT] User ${userId} uploaded file ${storagePath} successfully.`);

    return NextResponse.json({
      url: imageUrl,
      path: storagePath,
      size: optimizedBuffer.length,
      mimeType: 'image/webp',
      uploadedAt: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
