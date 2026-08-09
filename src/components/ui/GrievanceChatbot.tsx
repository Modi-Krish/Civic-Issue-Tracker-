/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Send, Image as ImageIcon, MapPin, 
  AlertTriangle, Heart, Check, Bot, User, Sparkles
} from 'lucide-react';
import { submitIssue } from '@/lib/client-actions/issue';
import { getConversationHistory, saveMessageToHistory } from '@/lib/client-actions/ai_history';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type FlowState = 'IDLE' | 'ASK_PROBLEM' | 'ASK_DEPT' | 'ASK_PHOTO' | 'ASK_LEVEL' | 'SUBMITTING' | 'DONE';

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

const Chip = ({ children, onClick, customColor = null }: any) => (
  <button onClick={onClick} style={{
    background: customColor ? `${customColor}22` : T.accentTint, 
    color: customColor || T.accentOnTint, 
    border: `1px solid ${customColor || T.accent}`,
    padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    boxShadow: SH.raisedSm, whiteSpace: 'nowrap'
  }}>
    {children}
  </button>
);

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
  
  // Guided Flow State
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [draftDetails, setDraftDetails] = useState<any>({
    title: '',
    description: '',
    category: '',
    department_slug: 'other',
    priority: 'MEDIUM',
  });

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

  const appendAiMsg = (text: string) => {
    const msg: Message = { sender: 'ai', text, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    if (user?.uid) saveMessageToHistory(`conv_${user.uid}`, user.uid, msg);
  };

  const appendUserMsg = (text: string) => {
    const msg: Message = { sender: 'citizen', text, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    if (user?.uid) saveMessageToHistory(`conv_${user.uid}`, user.uid, msg);
  };

  const sendWelcomeMessage = (lang: 'en' | 'hi' | 'gu') => {
    let welcome = "Hello! I am your AI Civic Assistant. How can I help you today?";
    if (lang === 'hi') welcome = "नमस्ते! मैं आपका एआई नागरिक सहायक हूँ। मैं आज आपकी कैसे मदद कर सकता हूँ?";
    else if (lang === 'gu') welcome = "નમસ્તે! હું તમારો એઆઈ નાગરિક સહાયક છું. આજે હું તમારી કેવી રીતે મદદ કરી શકું?";
    appendAiMsg(welcome);
    setFlowState('IDLE');
  };

  useEffect(() => {
    if (isOpen) {
      if (user?.uid) {
        getConversationHistory(user.uid).then(({ messages: history }) => {
          if (history.length > 0) {
            setMessages(history);
            // Resume flow if history ends with something specific, or just reset to IDLE
            setFlowState('IDLE'); 
            appendAiMsg("Welcome back! How can I help you today?");
          } else {
            sendWelcomeMessage(preferredLang);
          }
        });
      } else {
        sendWelcomeMessage(preferredLang);
      }

      captureGPS();
    }
  }, [isOpen]);

  const captureGPS = (retry = false) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocationLabel(`Location captured: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          if (retry) {
             appendAiMsg("GPS location secured! Submitting your issue...");
             submitFlow(draftDetails, pos.coords.latitude, pos.coords.longitude);
          }
        },
        (err) => {
          console.warn("Geolocation failed:", err);
          if (!retry) {
             setLocationLabel('GPS unavailable. Defaulting to municipal center.');
             setLat(22.3072);
             setLng(73.1812);
          } else {
             appendAiMsg("Failed to get GPS. Please ensure location services are enabled on your device.");
          }
        },
        { timeout: 10000 }
      );
    } else if (retry) {
        appendAiMsg("GPS is not supported on this device.");
    }
  };

  const handleLanguageChange = (lang: 'en' | 'hi' | 'gu') => {
    setPreferredLang(lang);
    sendWelcomeMessage(lang);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, flowState, filePreview]);

  if (!isOpen) return null;

  const toggleRecording = async () => {
    setSpeechError(null);
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        setLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        try {
          const res = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Speech processing failed');
          const data = await res.json();
          if (data.text) {
            setInputText(data.text);
            sendMessage(data.text);
          }
        } catch (err: any) {
          setSpeechError(err.message || 'Failed to process audio');
        } finally {
          setLoading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setSpeechError(err.message || 'Microphone access denied');
      setIsRecording(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
        if (flowState === 'ASK_PHOTO') {
            appendUserMsg("[Photo Uploaded]");
            setFlowState('ASK_LEVEL');
            appendAiMsg("Great. Finally, what is the priority level of this issue?");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async (overrideText?: string, isHidden?: boolean) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() && !filePreview) return;

    if (!isHidden) {
      appendUserMsg(textToSend);
      setInputText('');
    }

    // Process based on State Machine
    if (flowState === 'IDLE') {
        // Assume they want to report a problem if they type directly
        setDraftDetails((prev: any) => ({ ...prev, description: textToSend, title: textToSend.substring(0, 30) + '...' }));
        setFlowState('ASK_DEPT');
        appendAiMsg("Got it. What is the department of your problem?");
    } else if (flowState === 'ASK_PROBLEM') {
        setDraftDetails((prev: any) => ({ ...prev, description: textToSend, title: textToSend.substring(0, 30) + '...' }));
        setFlowState('ASK_DEPT');
        appendAiMsg("Thank you. What is the department of your problem?");
    } else if (flowState === 'ASK_DEPT') {
        // Fallback if they type the department
        setDraftDetails((prev: any) => ({ ...prev, category: 'Other', department_slug: 'other' }));
        setFlowState('ASK_PHOTO');
        appendAiMsg("Please provide a photo of the issue. You can use the image icon below, or tap 'Skip'.");
    } else if (flowState === 'ASK_PHOTO') {
        if (textToSend.toLowerCase().includes('skip')) {
            setFlowState('ASK_LEVEL');
            appendAiMsg("What is the priority level of this issue?");
        }
    } else if (flowState === 'ASK_LEVEL') {
        let p = 'MEDIUM';
        if (textToSend.toLowerCase().includes('high')) p = 'CRITICAL';
        if (textToSend.toLowerCase().includes('low')) p = 'LOW';
        handleLevelSelect(p, textToSend);
    }
  };

  // Predefined Action Handlers
  const handleAction = async (action: string) => {
      appendUserMsg(action);
      
      if (action === 'Report a problem') {
          setFlowState('ASK_PROBLEM');
          appendAiMsg("What is your problem? Please describe it briefly.");
      } else if (action === 'Status of my previous problem') {
          setLoading(true);
          try {
             const q = query(collection(db, 'issues'), where('reporter_id', '==', user.uid));
             const snaps = await getDocs(q);
             if (snaps.empty) {
                appendAiMsg("You don't have any previous problems reported.");
             } else {
                const issues = snaps.docs.map(d => ({id: d.id, ...d.data()})).sort((a:any, b:any) => b.created_at?.toMillis() - a.created_at?.toMillis());
                const latest = issues[0] as any;
                appendAiMsg(`Your most recent issue "${latest.title}" is currently marked as ${latest.status}.`);
             }
          } catch(e) {
             appendAiMsg("Sorry, I couldn't fetch your previous problems right now.");
          }
          setLoading(false);
          setFlowState('IDLE');
      } else if (action === 'Problems nearby me') {
          appendAiMsg("You can view all reported problems near you on the Map view in your Dashboard!");
          setFlowState('IDLE');
      }
  };

  const handleDeptSelect = (slug: string, categoryName: string) => {
      appendUserMsg(categoryName);
      setDraftDetails((prev: any) => ({ ...prev, category: categoryName, department_slug: slug }));
      setFlowState('ASK_PHOTO');
      appendAiMsg("Please provide a photo of the issue. You can use the image icon below, or tap 'Skip'.");
  };

  const handleLevelSelect = (levelCode: string, levelName: string) => {
      appendUserMsg(levelName);
      setDraftDetails((prev: any) => ({ ...prev, priority: levelCode }));
      
      setFlowState('SUBMITTING');
      if (!lat || !lng) {
          appendAiMsg("I need your GPS location to submit this report. Please enable location services on your device and click 'Retry GPS' below.");
      } else {
          appendAiMsg("Submitting your grievance...");
          // Execute submission
          submitFlow({ ...draftDetails, priority: levelCode }, lat, lng);
      }
  };

  const submitFlow = async (finalDetails: any, currentLat: number | null, currentLng: number | null) => {
      setLoading(true);
      try {
        let finalFilePath = '';
        if (selectedFile) {
          setUploadingImage(true);
          const uploadForm = new FormData();
          uploadForm.append('file', selectedFile);
          uploadForm.append('folder', 'grievances');
          const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: uploadForm });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.path) finalFilePath = uploadData.path;
          else finalFilePath = filePreview || '';
          setUploadingImage(false);
        }

        const submitPayload = {
          title: finalDetails.title,
          description: finalDetails.description,
          issueType: finalDetails.category,
          deptSlug: finalDetails.department_slug,
          locationLat: currentLat || lat || 22.3072,
          locationLng: currentLng || lng || 73.1812,
          locationLabel: locationLabel,
          filePath: finalFilePath,
          originalLanguage: preferredLang,
          originalText: finalDetails.description,
          translatedText: finalDetails.description, // simplified for guided flow
          preferredLanguage: preferredLang,
          aiPriority: finalDetails.priority,
          finalPriority: finalDetails.priority,
          priorityReason: "User designated priority",
        };

        const result = await submitIssue(submitPayload);
        if (result.error) throw new Error(result.error);

        setSelectedFile(null);
        setFilePreview(null);
        
        appendAiMsg(`Success! Your grievance has been registered.
        
📋 **Grievance Number:** ${result.complaintNumber}
🏢 **Department:** ${finalDetails.category}
⚠️ **Priority:** ${finalDetails.priority}

You will receive real-time updates as our teams begin work.`);
        
        setFlowState('DONE');
        
      } catch (err: any) {
        console.error(err);
        appendAiMsg(`Failed to submit grievance: ${err.message}`);
        setFlowState('IDLE');
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
            <div style={{ display: 'flex', background: T.base, borderRadius: 10, padding: 3, boxShadow: SH.insetSoft }}>
              {[{ code: 'en', label: 'EN' }, { code: 'hi', label: 'HI' }, { code: 'gu', label: 'GU' }].map(lang => (
                <button key={lang.code} onClick={() => handleLanguageChange(lang.code as any)}
                  style={{
                    border: 'none', background: preferredLang === lang.code ? T.raised : 'transparent',
                    boxShadow: preferredLang === lang.code ? SH.raisedSm : 'none',
                    fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
                    color: preferredLang === lang.code ? T.accent : T.text2, cursor: 'pointer', transition: 'all 0.15s'
                  }}>
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
            return (
              <div key={index} style={{
                alignSelf: isAI ? 'flex-start' : 'flex-end',
                maxWidth: '85%', display: 'flex', flexDirection: 'column',
                alignItems: isAI ? 'flex-start' : 'flex-end'
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: isAI ? 'row' : 'row-reverse' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: isAI ? T.accentTint : T.raised,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SH.raisedSm, flexShrink: 0
                  }}>
                    {isAI ? <Bot size={14} color={T.accent} /> : <User size={14} color={T.text2} />}
                  </div>
                  <div style={{
                    background: isAI ? T.raised : T.accent,
                    color: isAI ? T.text1 : 'white',
                    padding: '12px 16px', borderRadius: 18,
                    borderTopLeftRadius: isAI ? 4 : 18, borderTopRightRadius: isAI ? 18 : 4,
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
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.accentTint, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SH.raisedSm }}>
                <Bot size={14} color={T.accent} />
              </div>
              <div style={{ background: T.raised, padding: '10px 14px', borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'bounce 0.6s infinite alternate' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'bounce 0.6s infinite alternate 0.2s' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'bounce 0.6s infinite alternate 0.4s' }} />
                <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-4px); } }`}</style>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* State Action Chips */}
        {!loading && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 20px', background: T.base }}>
              {flowState === 'IDLE' && (
                <>
                  <Chip onClick={() => handleAction('Report a problem')}>Report a problem</Chip>
                  <Chip onClick={() => handleAction('Status of my previous problem')}>Status of my previous problem</Chip>
                  <Chip onClick={() => handleAction('Problems nearby me')}>Problems nearby me</Chip>
                </>
              )}
              {flowState === 'ASK_DEPT' && (
                <>
                  <Chip onClick={() => handleDeptSelect('sanitation', 'Sanitation')}>Sanitation</Chip>
                  <Chip onClick={() => handleDeptSelect('roads', 'Road Damage')}>Road Damage</Chip>
                  <Chip onClick={() => handleDeptSelect('water', 'Water Leakage')}>Water Leakage</Chip>
                  <Chip onClick={() => handleDeptSelect('electricity', 'Electricity')}>Electricity Fault</Chip>
                  <Chip onClick={() => handleDeptSelect('other', 'Other')}>Other</Chip>
                </>
              )}
              {flowState === 'ASK_PHOTO' && (
                <>
                  <Chip onClick={() => fileInputRef.current?.click()}>Upload Photo</Chip>
                  <Chip onClick={() => sendMessage('Skip Photo', true)}>Skip Photo</Chip>
                </>
              )}
              {flowState === 'ASK_LEVEL' && (
                <>
                  <Chip onClick={() => handleLevelSelect('CRITICAL', 'High Priority')} customColor="#B91C1C">High (Emergency)</Chip>
                  <Chip onClick={() => handleLevelSelect('MEDIUM', 'Medium Priority')} customColor="#C2410C">Medium</Chip>
                  <Chip onClick={() => handleLevelSelect('LOW', 'Low Priority')}>Low</Chip>
                </>
              )}
              {flowState === 'DONE' && (
                <Chip onClick={() => setFlowState('IDLE')}>Start New Conversation</Chip>
              )}
            </div>
        )}

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
        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: filePreview ? T.accent : T.text3, padding: 6 }}>
                <ImageIcon size={18} />
              </button>
            </div>
            <button
              onClick={toggleRecording}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: isRecording ? '#B91C1C' : T.raised, boxShadow: isRecording ? SH.inset : SH.raisedSm,
                color: isRecording ? 'white' : T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              {isRecording ? <MicOff size={18} className="animate-pulse" /> : <Mic size={18} />}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={loading || (!inputText.trim() && !filePreview)}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: T.accent, color: 'white', boxShadow: SH.raisedSm,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', opacity: (loading || (!inputText.trim() && !filePreview)) ? 0.5 : 1
              }}
            >
              <Send size={18} />
            </button>
          </div>

          {speechError && <div style={{ fontSize: 10, color: '#B91C1C', padding: '0 4px' }}>⚠️ {speechError}</div>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.text3, fontSize: 9, padding: '0 4px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
               <MapPin size={10} color={lat ? T.accent : '#B91C1C'} />
               <span>{locationLabel}</span>
            </div>
            {(!lat || !lng) && (
               <button onClick={() => captureGPS(true)} style={{ background: 'none', border: 'none', color: T.accent, fontSize: 9, cursor: 'pointer', fontWeight: 700 }}>
                  Retry GPS
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
