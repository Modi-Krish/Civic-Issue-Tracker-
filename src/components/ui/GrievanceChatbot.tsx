/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Send, Image as ImageIcon, MapPin, 
  AlertTriangle, Heart, Check, RefreshCw, Bot, User, 
  HelpCircle, ClipboardList, Eye, Sparkles
} from 'lucide-react';
import { submitIssue } from '@/lib/client-actions/issue';
import { getConversationHistory, saveMessageToHistory } from '@/lib/client-actions/ai_history';

interface Message {
  sender: 'citizen' | 'ai';
  text: string;
  timestamp: Date;
  isConfirmationCard?: boolean;
  confirmationDetails?: any;
}

const T = {
  base:         "#EDEBE4",
  raised:       "#F5F3EC",
  border:       "#DDD9CE",
  text1:        "#2C2C2A",
  text2:        "#5F5E5A",
  text3:        "#888780",
  accent:       "#1D9E75",
  accentDark:   "#167A5B",
  accentTint:   "#E1F5EE",
  accentOnTint: "#085041",
  shL: "rgba(255,255,255,0.75)",
  shD: "rgba(0,0,0,0.09)",
};

const SH = {
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:     `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

export default function GrievanceChatbot({ 
  isOpen, 
  onClose, 
  user 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [preferredLang, setPreferredLang] = useState<'en' | 'hi' | 'gu'>('en');
  
  // Location states
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('Obtaining location...');

  // Audio/Speech states
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize location & load history
  useEffect(() => {
    if (isOpen) {
      if (user?.uid) {
        getConversationHistory(user.uid).then(({ messages: history }) => {
          if (history.length > 0) {
            setMessages(history);
          } else {
            sendWelcomeMessage(preferredLang);
          }
        });
      } else {
        sendWelcomeMessage(preferredLang);
      }

      // Get user coordinate location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude);
            setLng(pos.coords.longitude);
            setLocationLabel(`Location captured: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          },
          (err) => {
            console.warn("Geolocation failed:", err);
            setLocationLabel('GPS unavailable. Defaulting to municipal center.');
            // Default Vadodara coordinates
            setLat(22.3072);
            setLng(73.1812);
          },
          { timeout: 10000 }
        );
      }
    }
  }, [isOpen]);

  const sendWelcomeMessage = (lang: 'en' | 'hi' | 'gu') => {
    let welcome = "Hello! I am your AI Civic Assistant. You can describe your grievance in your own words, upload a photo, or dictate in English, Hindi, or Gujarati. I will classify it and assign it to the correct department automatically.";
    if (lang === 'hi') {
      welcome = "नमस्ते! मैं आपका एआई नागरिक सहायक हूँ। आप अपनी शिकायत को अपनी भाषा में लिख सकते हैं, फोटो अपलोड कर सकते हैं, या अंग्रेजी, हिंदी या गुजराती में बोल सकते हैं। मैं इसे वर्गीकृत करके स्वचालित रूप से सही विभाग को सौंप दूंगा।";
    } else if (lang === 'gu') {
      welcome = "નમસ્તે! હું તમારો એઆઈ નાગરિક સહાયક છું. તમે તમારી ફરિયાદ તમારી પોતાની ભાષામાં લખી શકો છો, ફોટો અપલોડ કરી શકો છો, અથવા અંગ્રેજી, હિન્દી અથવા ગુજરાતીમાં બોલી શકો છો. હું તેનું વર્ગીકરણ કરીને આપમેળે યોગ્ય વિભાગને સોંપી દઈશ.";
    }

    const welcomeMsg: Message = {
      sender: 'ai',
      text: welcome,
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
    if (user?.uid) {
      saveMessageToHistory(`conv_${user.uid}`, user.uid, welcomeMsg);
    }
  };

  const handleLanguageChange = (lang: 'en' | 'hi' | 'gu') => {
    setPreferredLang(lang);
    sendWelcomeMessage(lang);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  // Local Audio Recording & Whisper Implementation
  const toggleRecording = async () => {
    setSpeechError(null);
    
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      return;
    }
    
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        
        try {
          const res = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData
          });
          
          if (!res.ok) throw new Error('Speech processing failed');
          const data = await res.json();
          if (data.text) {
            setInputText(data.text);
            sendMessage(data.text);
          }
        } catch (err: any) {
          console.error("Audio upload error:", err);
          setSpeechError(err.message || 'Failed to process audio');
        } finally {
          setLoading(false);
          // Stop tracks to release mic
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      setSpeechError(err.message || 'Microphone access denied');
      setIsRecording(false);
    }
  };


  // Image Upload helper
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message flow
  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() && !filePreview) return;

    // 1. Add user message
    const userMsg: Message = {
      sender: 'citizen',
      text: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (user?.uid) {
      saveMessageToHistory(`conv_${user.uid}`, user.uid, userMsg);
    }
    
    setInputText('');
    setLoading(true);

    try {
      // Build history for conversational AI
      const history = messages.filter(m => !m.isConfirmationCard).map(m => ({
        role: m.sender === 'citizen' ? 'user' : 'assistant',
        content: m.text
      }));
      // Append the new message
      history.push({ role: 'user', content: textToSend });

      // 2. Call backend classification
      const payload: any = {
        messages: history,
        text: textToSend, // keep for backward compatibility or simple processing
        lat,
        lng,
        preferredLanguage: preferredLang
      };

      if (filePreview) {
        payload.image = filePreview;
        payload.mimeType = selectedFile?.type || 'image/jpeg';
      }

      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Server classification failed');

      // 3. Add AI conversational response
      const aiReply = data.textAnalysis?.conversational_response || 
                      "I understood your complaint. Please verify the details below.";
      
      const aiMsg: Message = {
        sender: 'ai',
        text: aiReply,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
      if (user?.uid) {
        saveMessageToHistory(`conv_${user.uid}`, user.uid, aiMsg);
      }

      // 4. Add Confirmation Card if data extracted AND complaint is ready
      // Fallback: if complaint_ready is undefined (old API), assume true
      const isReady = data.complaint_ready !== false;
      if (data.textAnalysis && isReady) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: '',
          timestamp: new Date(),
          isConfirmationCard: true,
          confirmationDetails: {
            ...data.textAnalysis,
            duplicates: data.duplicates || [],
            imageAnalysis: data.imageAnalysis || null
          }
        }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Sorry, I encountered an error: ${err.message}. Let's try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Support / Back an existing duplicate issue
  const handleSupportIssue = async (issueId: string) => {
    setLoading(true);
    try {
      const { doc, updateDoc, increment, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const ref = doc(db, 'issues', issueId);
      await updateDoc(ref, {
        support_count: increment(1),
        supporters: arrayUnion(user.uid)
      });

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Thank you! I have registered your support for this existing issue. You will receive real-time notifications about its progress.`,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error(error);
      alert("Failed to support issue: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete Final Submission
  const handleConfirmSubmission = async (details: any) => {
    setLoading(true);
    try {
      let finalFilePath = '';

      // Upload image first if attached
      if (selectedFile) {
        setUploadingImage(true);
        const uploadForm = new FormData();
        uploadForm.append('file', selectedFile);
        uploadForm.append('folder', 'grievances');

        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: uploadForm
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.path) {
          finalFilePath = uploadData.path;
        } else {
          console.warn("Storage upload failed, fallback to base64 preview path.");
          finalFilePath = filePreview || '';
        }
        setUploadingImage(false);
      }

      // Submit issue
      const submitPayload = {
        title: details.title,
        description: details.description,
        issueType: details.category,
        deptSlug: details.department_slug,
        locationLat: lat ?? undefined,
        locationLng: lng ?? undefined,
        locationLabel: locationLabel,
        filePath: finalFilePath,
        originalLanguage: details.language || preferredLang,
        originalText: details.description,
        translatedText: details.description_en,
        preferredLanguage: preferredLang,
        aiExtractedInfo: details,
        aiPriority: details.priority,
        finalPriority: details.priority,
        priorityReason: details.priority_reason
      };

      const result = await submitIssue(submitPayload);

      if (result.error) throw new Error(result.error);

      // Reset image preview state
      setSelectedFile(null);
      setFilePreview(null);

      // Render success message
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Success! Your grievance has been registered.
        
📋 **Grievance Number:** ${result.complaintNumber}
🏢 **Department:** ${details.category} (${details.department_slug})
⚠️ **Priority:** ${details.priority}

You will receive real-time updates as our teams begin work.`,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Failed to submit grievance: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        width: '100%', maxWidth: 500, height: '85vh',
        backgroundColor: T.raised,
        borderRadius: 24, padding: 0,
        boxShadow: `0 12px 40px ${T.shD}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: `1px solid ${T.border}`
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', background: T.raised,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, background: T.accentTint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: SH.raisedSm
            }}>
              <Sparkles size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.text1 }}>Civic AI Assistant</div>
              <div style={{ fontSize: 10, color: T.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multilingual Helpdesk</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Language select buttons */}
            <div style={{
              display: 'flex', background: T.base, borderRadius: 10, padding: 3,
              boxShadow: SH.insetSoft
            }}>
              {[
                { code: 'en', label: 'EN' },
                { code: 'hi', label: 'HI' },
                { code: 'gu', label: 'GU' }
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code as any)}
                  style={{
                    border: 'none', background: preferredLang === lang.code ? T.raised : 'transparent',
                    boxShadow: preferredLang === lang.code ? SH.raisedSm : 'none',
                    fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
                    color: preferredLang === lang.code ? T.accent : T.text2, cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <button onClick={onClose} style={{
              background: T.raised, border: 'none', cursor: 'pointer', width: 34, height: 34,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: SH.raisedSm, color: T.text2
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Panel */}
        <div style={{
          flex: 1, padding: 20, overflowY: 'auto', background: T.base,
          display: 'flex', flexDirection: 'column', gap: 16
        }}>
          {messages.map((msg, index) => {
            const isAI = msg.sender === 'ai';
            
            if (msg.isConfirmationCard) {
              const det = msg.confirmationDetails;
              const hasDups = det.duplicates && det.duplicates.length > 0;
              return (
                <div key={index} style={{
                  background: T.raised, borderRadius: 20, padding: 18,
                  boxShadow: SH.raised, border: `1px solid ${T.border}`,
                  alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.accent }}>
                    <Sparkles size={16} />
                    <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Grievance Analysis</span>
                  </div>

                  <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.text1, marginBottom: 4 }}>{det.title}</div>
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.4 }}>{det.description}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: T.base, padding: '8px 12px', borderRadius: 10, boxShadow: SH.insetSoft }}>
                      <span style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', display: 'block' }}>Category</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>{det.category}</span>
                    </div>
                    <div style={{ background: T.base, padding: '8px 12px', borderRadius: 10, boxShadow: SH.insetSoft }}>
                      <span style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', display: 'block' }}>Priority</span>
                      <span style={{ 
                        fontSize: 12, fontWeight: 800, 
                        color: det.priority === 'CRITICAL' ? '#B91C1C' : det.priority === 'HIGH' ? '#C2410C' : T.text1
                      }}>{det.priority}</span>
                    </div>
                  </div>

                  {det.priority_reason && (
                    <div style={{ fontSize: 10, color: T.text3, fontStyle: 'italic' }}>
                      💡 {det.priority_reason}
                    </div>
                  )}

                  {/* Proximity Duplicate List */}
                  {hasDups && (
                    <div style={{
                      background: '#FEF3C7', padding: 12, borderRadius: 14,
                      border: '1px solid #FCD34D'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B45309', marginBottom: 6 }}>
                        <AlertTriangle size={14} />
                        <span style={{ fontSize: 11, fontWeight: 800 }}>Similar Issues Found Nearby!</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {det.duplicates.map((dup: any) => (
                          <div key={dup.id} style={{ background: 'rgba(255,255,255,0.5)', padding: 10, borderRadius: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{dup.title}</div>
                            <div style={{ fontSize: 10, color: T.text2 }}>{dup.distance}m away • {dup.support_count} supporters</div>
                            <button
                              onClick={() => handleSupportIssue(dup.id)}
                              style={{
                                marginTop: 6, border: 'none', background: T.accent, color: 'white',
                                fontSize: 10, fontWeight: 800, padding: '6px 12px', borderRadius: 8,
                                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                              }}
                            >
                              <Heart size={10} fill="white" /> Support & Track This Issue
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm Submission Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => handleConfirmSubmission(det)}
                      disabled={loading || uploadingImage}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                        background: T.accent, color: 'white', fontWeight: 800, fontSize: 13,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, boxShadow: SH.raisedSm
                      }}
                    >
                      <Check size={16} /> Confirm & Submit Grievance
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} style={{
                alignSelf: isAI ? 'flex-start' : 'flex-end',
                maxWidth: '85%', display: 'flex', flexDirection: 'column',
                alignItems: isAI ? 'flex-start' : 'flex-end'
              }}>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  flexDirection: isAI ? 'row' : 'row-reverse'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: isAI ? T.accentTint : T.raised,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: SH.raisedSm, flexShrink: 0
                  }}>
                    {isAI ? <Bot size={14} color={T.accent} /> : <User size={14} color={T.text2} />}
                  </div>

                  {/* Message Bubble */}
                  <div style={{
                    background: isAI ? T.raised : T.accent,
                    color: isAI ? T.text1 : 'white',
                    padding: '12px 16px', borderRadius: 18,
                    borderTopLeftRadius: isAI ? 4 : 18,
                    borderTopRightRadius: isAI ? 18 : 4,
                    boxShadow: SH.raised, border: `1px solid ${isAI ? T.border : 'transparent'}`,
                    fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap'
                  }}>
                    {msg.text}
                  </div>
                </div>
                <span style={{ fontSize: 9, color: T.text3, marginTop: 4, padding: '0 36px' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: T.accentTint,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SH.raisedSm
              }}>
                <Bot size={14} color={T.accent} />
              </div>
              <div style={{
                background: T.raised, padding: '10px 14px', borderRadius: 16,
                border: `1px solid ${T.border}`, boxShadow: SH.raised,
                display: 'flex', gap: 4, alignItems: 'center'
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'bounce 0.6s infinite alternate' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'bounce 0.6s infinite alternate 0.2s' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'bounce 0.6s infinite alternate 0.4s' }} />
                <style>{`
                  @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-4px); } }
                `}</style>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Image Preview */}
        {filePreview && (
          <div style={{
            background: T.raised, borderTop: `1px solid ${T.border}`, padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={filePreview} alt="Preview" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: `1px solid ${T.border}` }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>Image Attached</div>
                <div style={{ fontSize: 10, color: T.text3 }}>{selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB</div>
              </div>
            </div>
            <button 
              onClick={() => { setSelectedFile(null); setFilePreview(null); }}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer', color: '#B91C1C',
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: SH.raisedSm
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div style={{
          padding: '16px 20px', background: T.raised,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', gap: 8
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') sendMessage();
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Input field */}
            <div style={{
              flex: 1, background: T.base, borderRadius: 14,
              boxShadow: SH.insetSoft, padding: '4px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1px solid ${T.border}`
            }}>
              <input
                type="text"
                placeholder={preferredLang === 'gu' ? 'તમારી ફરિયાદ લખો...' : preferredLang === 'hi' ? 'अपनी शिकायत लिखें...' : 'Type your grievance...'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', padding: '10px 0', fontSize: 13,
                  fontWeight: 700, color: T.text1, fontFamily: 'inherit'
                }}
              />

              <input 
                type="file" accept="image/*" ref={fileInputRef} 
                onChange={handleFileChange} style={{ display: 'none' }} 
              />
              
              <button 
                onClick={handleImageSelect}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: filePreview ? T.accent : T.text3, padding: 6,
                  transition: 'color 0.2s'
                }}
              >
                <ImageIcon size={18} />
              </button>
            </div>

            {/* Voice button */}
            <button
              onClick={toggleRecording}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: isRecording ? '#B91C1C' : T.raised,
                boxShadow: isRecording ? SH.inset : SH.raisedSm,
                color: isRecording ? 'white' : T.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {isRecording ? <MicOff size={18} className="animate-pulse" /> : <Mic size={18} />}
            </button>

            {/* Send button */}
            <button
              onClick={() => sendMessage()}
              disabled={loading || (!inputText.trim() && !filePreview)}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: T.accent, color: 'white',
                boxShadow: SH.raisedSm,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', opacity: (loading || (!inputText.trim() && !filePreview)) ? 0.5 : 1
              }}
            >
              <Send size={18} />
            </button>
          </div>

          {speechError && (
            <div style={{ fontSize: 10, color: '#B91C1C', padding: '0 4px' }}>
              ⚠️ {speechError}
            </div>
          )}

          {/* Prompt location footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.text3, fontSize: 9, padding: '0 4px' }}>
            <MapPin size={10} color={lat ? T.accent : T.text3} />
            <span>{locationLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
