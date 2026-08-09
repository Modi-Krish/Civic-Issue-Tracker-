import io
from faster_whisper import WhisperModel
from app.config import settings

# Load model globally to avoid reloading on every request
print(f"Loading Whisper model: {settings.WHISPER_MODEL}...")
try:
    # Use CPU by default for portability, device="cuda" if GPU is available
    whisper_model = WhisperModel(settings.WHISPER_MODEL, device="cpu", compute_type="int8")
except Exception as e:
    print(f"Failed to load whisper model: {e}")
    whisper_model = None

def transcribe_audio(audio_bytes: bytes) -> str:
    if not whisper_model:
        raise Exception("Whisper model is not loaded")
    
    # faster-whisper accepts file-like objects or paths
    segments, info = whisper_model.transcribe(io.BytesIO(audio_bytes), beam_size=5)
    
    text = " ".join([segment.text for segment in segments])
    return text.strip()
