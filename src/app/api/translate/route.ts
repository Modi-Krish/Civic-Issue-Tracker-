/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { translateText } from '@/lib/services/gemini';

export async function POST(request: Request) {
  try {
    const { text, targetLanguage } = await request.json();
    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Text and targetLanguage are required' }, { status: 400 });
    }

    const translatedText = await translateText(text, targetLanguage);
    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error("Translation API exception:", error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}
