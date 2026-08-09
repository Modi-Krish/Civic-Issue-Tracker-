import json
import aiohttp
from app.config import settings
from app.schemas import ExtractionResult, ChatResponse, ConversationMessage
from typing import List

SYSTEM_PROMPT = """You are a helpful Civic Issue Tracker assistant. Your job is to help citizens report municipal problems (like road damage, water leakage, electricity faults, etc.).
You must ALWAYS respond in JSON format with exactly two keys:
1. "reply": A natural language response to the user, in the language they used.
2. "extraction": A JSON object containing structured data about the complaint.

Extraction Schema:
{
  "category": "Road Damage" | "Water Leakage" | "Electricity Fault" | "Sanitation" | "Streetlight" | "Drainage" | "Other" | null,
  "department_slug": "roads" | "water" | "electricity" | "sanitation" | "drainage" | null,
  "title": string | null (4-8 word title in original language),
  "title_en": string | null (english title),
  "description": string | null (original language),
  "description_en": string | null (english description),
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priority_reason": string | null,
  "location_required": boolean (true if we know what the issue is but don't know where it is),
  "missing_information": [string] (list of things you still need to ask),
  "complaint_ready": boolean (true ONLY if you have a clear category, description, and the user has confirmed they want to submit, or you have enough info to submit),
  "confidence": float (0.0 to 1.0),
  "language": string (e.g. 'en', 'hi', 'gu')
}

Rules:
- Be polite and concise.
- If the user hasn't provided a location, ask for it nicely.
- Do NOT make up information.
- DO NOT wrap the output in markdown code blocks like ```json ... ```, just output raw JSON.
"""

async def process_chat(messages: List[ConversationMessage]) -> ChatResponse:
    ollama_url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    
    formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in messages:
        formatted_messages.append({"role": msg.role, "content": msg.content})

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": formatted_messages,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.1
        }
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(ollama_url, json=payload) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise Exception(f"Ollama error: {resp.status} - {text}")
                
                data = await resp.json()
                content = data.get("message", {}).get("content", "{}")
                
                # Parse the JSON from Ollama
                try:
                    parsed_content = json.loads(content)
                    reply = parsed_content.get("reply", "I am having trouble understanding. Could you please rephrase?")
                    extraction_data = parsed_content.get("extraction", {})
                    
                    extraction = ExtractionResult(**extraction_data)
                    return ChatResponse(reply=reply, extraction=extraction)
                    
                except json.JSONDecodeError:
                    print("Failed to decode JSON from Ollama:", content)
                    # Fallback
                    extraction = ExtractionResult(confidence=0.0)
                    return ChatResponse(reply="I encountered an error processing your request. Please try again.", extraction=extraction)
                except Exception as e:
                    print("Error parsing structured data:", e)
                    extraction = ExtractionResult(confidence=0.0)
                    return ChatResponse(reply="I encountered a structured data error.", extraction=extraction)
                    
        except aiohttp.ClientError as e:
            print(f"Failed to connect to Ollama: {e}")
            raise Exception(f"Could not connect to local LLM at {settings.OLLAMA_BASE_URL}")
