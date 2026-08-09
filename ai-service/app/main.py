from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import ChatRequest, ChatResponse
from app.services import llm_service, speech_service

app = FastAPI(title="Civic Issue AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "ollama_model": settings.OLLAMA_MODEL, "whisper_model": settings.WHISPER_MODEL}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        response = await llm_service.process_chat(request.messages)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    if not file.filename.endswith((".wav", ".mp3", ".m4a", ".ogg", ".webm")):
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    try:
        content = await file.read()
        text = speech_service.transcribe_audio(content)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
