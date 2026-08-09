import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    
    // Create new FormData to send to FastAPI
    const uploadForm = new FormData();
    uploadForm.append('file', file as Blob, 'recording.webm');

    const res = await fetch(`${aiServiceUrl}/api/speech-to-text`, {
      method: 'POST',
      body: uploadForm
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('FastAPI Speech error:', errorText);
      throw new Error(`Speech-to-text service returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
