from pydantic import BaseModel, Field
from typing import List, Optional

class ConversationMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., description="The message content")

class ChatRequest(BaseModel):
    messages: List[ConversationMessage]
    language: Optional[str] = "en"

class ExtractionResult(BaseModel):
    category: Optional[str] = Field(None, description="The identified issue category (e.g. 'Road Damage', 'Water Leakage', 'Electricity Fault', 'Sanitation', 'Streetlight', 'Drainage', 'Other')")
    department_slug: Optional[str] = Field(None, description="roads, water, electricity, sanitation, drainage")
    title: Optional[str] = Field(None, description="A short 4-8 word title in the original language")
    title_en: Optional[str] = Field(None, description="English translated title")
    description: Optional[str] = Field(None, description="Detailed description of the issue in the original language")
    description_en: Optional[str] = Field(None, description="English translated description")
    priority: Optional[str] = Field("MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    priority_reason: Optional[str] = Field(None, description="Brief reasoning for priority")
    language: str = Field("en", description="Detected language code (e.g. 'en', 'gu', 'hi')")
    location_required: bool = Field(False, description="True if location is necessary but not provided yet")
    missing_information: List[str] = Field(default_factory=list, description="List of missing details to ask the user")
    complaint_ready: bool = Field(False, description="True if all required info is gathered and complaint can be submitted")
    confidence: float = Field(..., description="Confidence score from 0.0 to 1.0")

class ChatResponse(BaseModel):
    reply: str
    extraction: ExtractionResult

