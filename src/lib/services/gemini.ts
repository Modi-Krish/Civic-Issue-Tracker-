/**
 * Google Gemini API Client Service for Civic Grievance System
 * Handles NLP extraction, Image analysis, and Translation with robust fallback.
 */

export interface AIChatResponse {
  language: 'en' | 'hi' | 'gu';
  category: 'Road Damage' | 'Water Leakage' | 'Electricity Fault' | 'Sanitation' | 'Streetlight' | 'Drainage' | 'Other';
  department_slug: 'roads' | 'water' | 'electricity' | 'sanitation' | 'drainage';
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safety_risk: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_reason: string;
  conversational_response: string;
}

export interface AIImageResponse {
  detected_issue: string;
  confidence: number;
  suggested_category: 'Road Damage' | 'Water Leakage' | 'Electricity Fault' | 'Sanitation' | 'Streetlight' | 'Drainage' | 'Other';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  analysis_reason: string;
}

const getApiKey = () => {
  return process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || '';
};

/**
 * Fallback keyword classifier for zero API key or failed network calls
 */
function localRuleBasedClassifier(text: string): AIChatResponse {
  const t = text.toLowerCase();
  let lang: 'en' | 'hi' | 'gu' = 'en';
  
  // Basic language detection
  if (/[અ-હ]/.test(text)) lang = 'gu';
  else if (/[अ-ह]/.test(text)) lang = 'hi';

  let category: AIChatResponse['category'] = 'Other';
  let dept: AIChatResponse['department_slug'] = 'sanitation';
  let priority: AIChatResponse['priority'] = 'LOW';
  let reason = 'Determined via client-side keyword matching.';
  let title = 'Grievance submission';
  let titleEn = 'Grievance submission';
  const desc = text;
  const descEn = text;

  // Category mapping
  if (t.includes('pothole') || t.includes('road') || t.includes('ખડો') || t.includes('રસ્તો') || t.includes('सड़क') || t.includes('खड्डा')) {
    category = 'Road Damage';
    dept = 'roads';
    priority = 'HIGH';
    title = lang === 'gu' ? 'રસ્તા નુકશાન ફરિયાદ' : lang === 'hi' ? 'सड़क मरम्मत शिकायत' : 'Road Damage Complaint';
    titleEn = 'Road Damage Complaint';
  } else if (t.includes('leak') || t.includes('water') || t.includes('પાણી') || t.includes('पानी')) {
    category = 'Water Leakage';
    dept = 'water';
    priority = 'MEDIUM';
    title = lang === 'gu' ? 'પાણી લીકેજ ફરિયાદ' : lang === 'hi' ? 'पानी रिसाव शिकायत' : 'Water Leakage Complaint';
    titleEn = 'Water Leakage Complaint';
  } else if (t.includes(' streetlight') || t.includes('street light') || t.includes('વીજળી') || t.includes('बिजली') || t.includes('light')) {
    category = 'Streetlight';
    dept = 'electricity';
    priority = 'MEDIUM';
    title = lang === 'gu' ? 'સ્ટ્રીટલાઇટ બંધ હોવા બાબત' : lang === 'hi' ? 'स्ट्रीट लाइट बंद होने की शिकायत' : 'Streetlight Outage';
    titleEn = 'Streetlight Outage';
  } else if (t.includes('electricity') || t.includes('power') || t.includes('કરંટ') || t.includes('करंट')) {
    category = 'Electricity Fault';
    dept = 'electricity';
    priority = 'HIGH';
    title = lang === 'gu' ? 'વીજળી ફોલ્ટ ફરિયાદ' : lang === 'hi' ? 'बिजली फॉल्ट शिकायत' : 'Electrical Grid Fault';
    titleEn = 'Electrical Grid Fault';
  } else if (t.includes('drain') || t.includes('sewage') || t.includes('gutter') || t.includes('ગટર') || t.includes('नाला')) {
    category = 'Drainage';
    dept = 'drainage';
    priority = 'HIGH';
    title = lang === 'gu' ? 'ગટર લાઇન ચોકઅપ ફરિયાદ' : lang === 'hi' ? 'गटर/नाली जाम शिकायत' : 'Drainage Blockage';
    titleEn = 'Drainage Blockage';
  } else if (t.includes('garbage') || t.includes('trash') || t.includes('kachro') || t.includes('કચરો') || t.includes('कचरा')) {
    category = 'Sanitation';
    dept = 'sanitation';
    priority = 'LOW';
    title = lang === 'gu' ? 'સફાઈ અને કચરા નિકાલ બાબત' : lang === 'hi' ? 'कचरा सफाई शिकायत' : 'Garbage Clean Up';
    titleEn = 'Garbage Clean Up';
  }

  // Safety risks escalation
  if (t.includes('danger') || t.includes('unsafe') || t.includes('hazard') || t.includes('ખતરો') || t.includes('खतरा') || t.includes('fall') || t.includes('મૃત્યુ') || t.includes('मौत')) {
    priority = 'CRITICAL';
    reason += ' Escaled due to hazard/safety risk keywords.';
  }

  const responses = {
    en: `Thank you for reporting this. I have classified this under the ${category} category, routed to the ${dept} department with ${priority} priority.`,
    hi: `सूचित करने के लिए धन्यवाद। मैंने आपकी शिकायत को ${category} के अंतर्गत वर्गीकृत किया है, जो ${priority} प्राथमिकता के साथ ${dept} विभाग को भेजी जाएगी।`,
    gu: `જાણ કરવા બદલ આભાર. મેં તમારી ફરિયાદને ${category} શ્રેણી હેઠળ વર્ગીકૃત કરી છે, જે ${priority} અગ્રતા સાથે ${dept} વિભાગમાં મોકલવામાં આવશે.`
  };

  return {
    language: lang,
    category,
    department_slug: dept,
    title,
    title_en: titleEn,
    description: desc,
    description_en: descEn,
    severity: priority,
    safety_risk: priority === 'CRITICAL',
    priority,
    priority_reason: reason,
    conversational_response: responses[lang]
  };
}

/**
 * 1. Analyze Grievance Complaint Text
 */
export async function analyzeGrievanceText(text: string): Promise<AIChatResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("AI_API_KEY is not set. Falling back to local rule-based classifier.");
    return localRuleBasedClassifier(text);
  }

  try {
    const prompt = `
You are an expert citizen grievance analyst for Indian Municipalities.
Analyze the following citizen complaint and extract structured information.
Support English, Hindi, and Gujarati. Automatically detect the language of input complaint.

Citizen Complaint: "${text}"

Extract the following:
1. language: 'en', 'hi', or 'gu' based on the input text.
2. category: Must be one of: "Road Damage", "Water Leakage", "Electricity Fault", "Sanitation", "Streetlight", "Drainage", "Other"
3. department_slug: Must match the category:
   - "Road Damage" -> "roads"
   - "Water Leakage" -> "water"
   - "Electricity Fault" -> "electricity"
   - "Streetlight" -> "electricity"
   - "Sanitation" -> "sanitation"
   - "Drainage" -> "drainage"
   - "Other" -> "sanitation"
4. title: A concise 4-8 word title for the grievance in the detected language.
5. title_en: The title translated to English.
6. description: The description of the complaint in the detected language.
7. description_en: The description translated to English.
8. severity: Assessment of the structural severity: "LOW", "MEDIUM", "HIGH", "CRITICAL".
9. safety_risk: true if there is an immediate bodily safety risk (e.g. open manholes, live wires, falling trees), false otherwise.
10. priority: Suggest priority level: "LOW", "MEDIUM", "HIGH", or "CRITICAL". Critical safety hazards MUST be CRITICAL.
11. priority_reason: Brief justification for priority.
12. conversational_response: A highly polite, empathetic, and encouraging acknowledgment message written in the detected language (English, Hindi, or Gujarati). Confirm you understood the issue and location if provided, and tell them you are ready to log their grievance.

Return ONLY a valid JSON object matching the requested schema. Do not wrap in markdown blocks.
`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              language: { type: 'STRING', enum: ['en', 'hi', 'gu'] },
              category: { type: 'STRING', enum: ['Road Damage', 'Water Leakage', 'Electricity Fault', 'Sanitation', 'Streetlight', 'Drainage', 'Other'] },
              department_slug: { type: 'STRING', enum: ['roads', 'water', 'electricity', 'sanitation', 'drainage'] },
              title: { type: 'STRING' },
              title_en: { type: 'STRING' },
              description: { type: 'STRING' },
              description_en: { type: 'STRING' },
              severity: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              safety_risk: { type: 'BOOLEAN' },
              priority: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              priority_reason: { type: 'STRING' },
              conversational_response: { type: 'STRING' }
            },
            required: ['language', 'category', 'department_slug', 'title', 'title_en', 'description', 'description_en', 'severity', 'safety_risk', 'priority', 'priority_reason', 'conversational_response']
          }
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini Text API error: ${res.statusText}`);
    }

    const data = await res.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) throw new Error("Empty AI response");
    
    return JSON.parse(jsonText) as AIChatResponse;
  } catch (err) {
    console.error("Gemini text analysis failed:", err);
    return localRuleBasedClassifier(text);
  }
}

/**
 * 2. Analyze Grievance Image Upload
 */
export async function analyzeGrievanceImage(base64Image: string, mimeType: string): Promise<AIImageResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("AI_API_KEY is not set. Skipping image analysis.");
    return {
      detected_issue: 'Visual evidence uploaded',
      confidence: 1.0,
      suggested_category: 'Other',
      severity: 'MEDIUM',
      analysis_reason: 'Skipped image analysis due to missing API key.'
    };
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
Analyze this civic issue photograph. Identify what type of damage or civic issue is visible in the image.
Provide:
1. detected_issue: A short 1-3 word name of the issue (e.g. "Pothole", "Pile of Garbage", "Broken Streetlight", "Water Leakage", "Clogged Drain").
2. confidence: Float score between 0.0 and 1.0 reflecting your prediction confidence.
3. suggested_category: Map to one of: "Road Damage", "Water Leakage", "Electricity Fault", "Sanitation", "Streetlight", "Drainage", "Other".
4. severity: Visual evaluation of severity ("LOW", "MEDIUM", "HIGH", "CRITICAL").
5. analysis_reason: Brief 1-sentence reasoning.

Return ONLY a valid JSON object matching the requested schema.
`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              detected_issue: { type: 'STRING' },
              confidence: { type: 'NUMBER' },
              suggested_category: { type: 'STRING', enum: ['Road Damage', 'Water Leakage', 'Electricity Fault', 'Sanitation', 'Streetlight', 'Drainage', 'Other'] },
              severity: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              analysis_reason: { type: 'STRING' }
            },
            required: ['detected_issue', 'confidence', 'suggested_category', 'severity', 'analysis_reason']
          }
        }
      })
    });

    if (!res.ok) throw new Error(`Gemini Image API error: ${res.statusText}`);

    const data = await res.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) throw new Error("Empty AI response");

    return JSON.parse(jsonText) as AIImageResponse;
  } catch (err) {
    console.error("Gemini image analysis failed:", err);
    return {
      detected_issue: 'Visual evidence uploaded',
      confidence: 0.5,
      suggested_category: 'Other',
      severity: 'MEDIUM',
      analysis_reason: 'Failed to complete image model analysis.'
    };
  }
}

/**
 * 3. Translate conversational text
 */
export async function translateText(text: string, targetLanguage: 'en' | 'hi' | 'gu'): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return text; // Fallback to original text

  try {
    const prompt = `
Translate the following text into ${targetLanguage === 'en' ? 'English' : targetLanguage === 'hi' ? 'Hindi' : 'Gujarati'}.
Ensure the tone is kept professional and matches the original message.
If it is already in that language, return it exactly.

Text: "${text}"

Return ONLY the translated string. Do not include quotes, markdown wrappers, or explanations.
`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) throw new Error("Translation request failed");
    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return responseText ? responseText.trim() : text;
  } catch (err) {
    console.error("Gemini Translation failed:", err);
    return text;
  }
}
