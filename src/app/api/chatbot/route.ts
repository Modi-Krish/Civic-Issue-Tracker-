/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { analyzeGrievanceText, analyzeGrievanceImage, translateText } from '@/lib/services/gemini';

// Haversine formula to compute distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, image, mimeType, lat, lng, preferredLanguage } = body;

    const responseData: any = {
      success: true,
    };

    let detectedCategory = 'Other';

    // 1. Text Analysis using local AI service
    if (text) {
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
        const aiRes = await fetch(`${aiServiceUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: body.messages || [{ role: 'user', content: text }],
            language: preferredLanguage || 'en'
          })
        });
        
        if (!aiRes.ok) {
          throw new Error(`AI service returned ${aiRes.status}`);
        }
        
        const aiData = await aiRes.json();
        
        // Map the FastAPI response to what the frontend expects
        const extraction = aiData.extraction;
        const textAnalysis = {
          category: extraction.category || 'Other',
          department_slug: extraction.department_slug || 'sanitation',
          priority: extraction.priority || 'MEDIUM',
          priority_reason: extraction.priority_reason || 'AI evaluation',
          title: extraction.title || 'Civic Issue',
          title_en: extraction.title_en || 'Civic Issue',
          description: extraction.description || text,
          description_en: extraction.description_en || text,
          language: extraction.language || 'en',
          conversational_response: aiData.reply
        };
        
        responseData.textAnalysis = textAnalysis;
        
        // Only mark it as detected category if it's ready, or we just trust the AI's current guess
        detectedCategory = textAnalysis.category;
        
        // Let the frontend know if it's NOT ready
        responseData.complaint_ready = extraction.complaint_ready;
        responseData.missing_information = extraction.missing_information;

      } catch (aiErr) {
        console.error("Local AI Service Error, falling back to gemini wrapper or rule-based:", aiErr);
        const textAnalysis = await analyzeGrievanceText(text);
        responseData.textAnalysis = textAnalysis;
        detectedCategory = textAnalysis.category;
        responseData.complaint_ready = true; // Rule-based is always one-shot
      }
    }

    // 2. Image Analysis (if uploaded)
    if (image) {
      const imageAnalysis = await analyzeGrievanceImage(image, mimeType || 'image/jpeg');
      responseData.imageAnalysis = imageAnalysis;
      
      // Use image suggested category if no text analysis was done
      if (!text) {
        detectedCategory = imageAnalysis.suggested_category;
      }
    }

    // 3. Proximity Duplicate Check (within 100 meters)
    const numericLat = parseFloat(String(lat));
    const numericLng = parseFloat(String(lng));

    if (!isNaN(numericLat) && !isNaN(numericLng) && numericLat !== 0 && numericLng !== 0) {
      responseData.location = { lat: numericLat, lng: numericLng };
      const db = getAdminDb();
      if (db) {
        try {
          const snapshot = await db.collection('issues')
            .where('issue_type', '==', detectedCategory)
            .get();

          const duplicates: any[] = [];
          snapshot.forEach(doc => {
            const d = doc.data();
            if (d.status !== 'CLOSED' && d.status !== 'APPROVED' && d.status !== 'REJECTED') {
              const itemLat = parseFloat(String(d.location_lat));
              const itemLng = parseFloat(String(d.location_lng));
              if (!isNaN(itemLat) && !isNaN(itemLng) && itemLat !== 0 && itemLng !== 0) {
                const dist = getDistanceMeters(numericLat, numericLng, itemLat, itemLng);
                if (dist <= 100) {
                  duplicates.push({
                    id: doc.id,
                    title: d.title,
                    description: d.description,
                    status: d.status,
                    support_count: d.support_count || 1,
                    distance: Math.round(dist)
                  });
                }
              }
            }
          });

          // Sort by distance ascending
          duplicates.sort((a, b) => a.distance - b.distance);
          responseData.duplicates = duplicates;
        } catch (dbErr) {
          console.warn("Duplicate query error:", dbErr);
          responseData.duplicates = [];
        }
      }
    }

    // 4. Translate Conversational Response if requested
    if (responseData.textAnalysis && preferredLanguage && preferredLanguage !== responseData.textAnalysis.language) {
      try {
        const translatedMessage = await translateText(
          responseData.textAnalysis.conversational_response,
          preferredLanguage
        );
        responseData.textAnalysis.conversational_response = translatedMessage;
      } catch (transErr) {
        console.warn("Conversational translation error:", transErr);
      }
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Chatbot API Exception:", error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
