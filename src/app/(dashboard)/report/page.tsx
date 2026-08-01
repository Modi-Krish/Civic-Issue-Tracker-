'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { submitIssue } from '@/lib/client-actions/issue';
import { ISSUE_TYPES, ISSUE_TYPE_TO_DEPARTMENT, type IssueType } from '@/lib/types/database';
import { Camera, MapPin, ArrowLeft, X, Send, Navigation, Info, Star, CheckCircle2 } from 'lucide-react';
import { takePhoto as nativeTakePhoto } from '@/lib/capacitor/camera';
import { getCurrentPosition } from '@/lib/capacitor/geolocation';
import { isNativePlatform } from '@/lib/capacitor/platform';
import { useImageUpload } from '@/hooks/useImageUpload';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type Step = 'photo' | 'details';

const ISSUE_EMOJIS: Record<string, string> = {
  'Road Damage': '🚧', 'Water Leakage': '💧', 'Electricity Fault': '⚡',
  'Sanitation': '🧹', 'Streetlight': '💡', 'Drainage': '🌊', 'Other': '⚠️',
};

const PRIORITY_CONFIG = {
  Low:    { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Low' },
  Medium: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', label: 'Medium' },
  High:   { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)',   label: 'High' },
};

export default function ReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('photo');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationLat, setLocationLat] = useState<number>(0);
  const [locationLng, setLocationLng] = useState<number>(0);
  const [locationLabel, setLocationLabel] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function detectLocation() {
    try {
      const pos = await getCurrentPosition();
      setLocationLat(pos.latitude);
      setLocationLng(pos.longitude);
      setLocationLabel(`${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`);
    } catch {
      setError('Could not detect location. Please enter manually.');
    }
  }

  async function handleNativeCamera() {
    const photo = await nativeTakePhoto();
    if (photo && photo.file) {
      setImageFile(photo.file);
      setImagePreview(photo.dataUrl);
      setStep('details');
      detectLocation();
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setStep('details');
      detectLocation();
    }
  }

  const { uploadImage, rollbackUpload } = useImageUpload({ cityId: 'vadodara', type: 'before' });

  async function handleSubmit() {
    if (!imageFile || !issueType || !title || !description) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Upload the image using our new secure hook
      const imageMetadata = await uploadImage(imageFile);
      
      if (!imageMetadata) {
        throw new Error('Image upload failed.');
      }

      try {
        // Map issue_type to department_id
        let department_id = null;
        if (issueType === 'Road Damage') department_id = 'roads';
        else if (issueType === 'Water Leakage') department_id = 'water';
        else if (issueType === 'Electricity Fault' || issueType === 'Streetlight') department_id = 'electricity';
        else if (issueType === 'Sanitation' || issueType === 'Drainage') department_id = 'sanitation';

        // 2. Save the issue to Firestore with the new image structure
        const docRef = await addDoc(collection(db, 'issues'), {
          title,
          description,
          issue_type: issueType,
          department_id,
          location_lat: locationLat,
          location_lng: locationLng,
          location_label: locationLabel,
          image: imageMetadata,
          status: 'REPORTED',
          reporter_id: auth.currentUser?.uid || 'anonymous',
          created_at: new Date().toISOString()
        });

        router.push(`/issue?id=${docRef.id}`);
      } catch (firestoreError: any) {
        // We ideally rollback the image here if we had the issueId in Firestore.
        // For now, log the error. The orphan image can be cleared by a backend cron.
        console.error('Failed to save to Firestore:', firestoreError);
        throw new Error('Failed to submit issue details. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0d0d0f",
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: "#ffffff",
    paddingBottom: 40,
  };

  if (step === 'photo') {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0 32px" }}>
            <button onClick={() => router.push('/dashboard')} style={{
              width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer"
            }}>
              <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
            </button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Report Issue</h1>
              <p style={{ fontSize: 11, color: "rgba(255, 46, 17, 0.6)", fontWeight: 600, margin: "2px 0 0" }}>HELP IMPROVE YOUR CITY 🌱</p>
            </div>
          </div>

          {/* Hero Upload Zone */}
          <div style={{
            borderRadius: 28, padding: "54px 32px", textAlign: "center",
            background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255, 46, 17, 0.25)", transition: "all 0.2s"
          }}>
            <div style={{
              width: 88, height: 88, borderRadius: 24, margin: "0 auto 24px",
              background: "linear-gradient(135deg, #FF2E11, #A79277)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 32px rgba(255, 46, 17, 0.4)",
            }}>
              <Camera size={36} color="white" />
            </div>

            <p style={{ fontSize: 19, fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Take an Issue Photo</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 32px", lineHeight: 1.5 }}>A clear photo helps the team understand the problem faster.</p>

            <div style={{ display: "flex", gap: 12 }}>
              {isNativePlatform() ? (
                <button onClick={handleNativeCamera} style={{ flex: 1, padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg, #FF2E11, #A79277)", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>📷 Take Photo</button>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg, #FF2E11, #A79277)", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>📷 Take Photo</button>
              )}
              <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "14px 0", borderRadius: 14, background: "rgba(255,255,255,0.05)", color: "#FF2E11", fontSize: 13, fontWeight: 700, border: "1.5px solid rgba(255, 46, 17, 0.3)", cursor: "pointer" }}>📁 Upload</button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleImageSelect} />
          </div>

          <div style={{ marginTop: 24, borderRadius: 18, padding: "18px", background: "rgba(255, 46, 17, 0.05)", border: "1px solid rgba(255, 46, 17, 0.15)" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#FF2E11", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>Submission Tips</p>
            {["Use good lighting", "Capture surroundings for context", "Ensure issue is centered"].map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
                <CheckCircle2 size={12} color="#FF2E11" />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ position: "relative", height: 240, overflow: "hidden" }}>
        {imagePreview && <Image src={imagePreview} alt="Issue preview" fill unoptimized style={{ objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)" }} />
        <button onClick={() => setStep('photo')} style={{ position: "absolute", top: 16, left: 16, width: 40, height: 40, borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={20} color="white" /></button>
        <button onClick={() => { setImageFile(null); setImagePreview(null); setStep('photo'); }} style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} color="white" /></button>
        <div style={{ position: "absolute", bottom: 20, left: 20, background: "rgba(255, 46, 17, 0.9)", borderRadius: 99, padding: "5px 14px", fontSize: 10, fontWeight: 800, color: "white", letterSpacing: "0.1em" }}>DETAILS FORM</div>
      </div>

      <div style={{ marginTop: -24, borderRadius: "28px 28px 0 0", background: "#0d0d0f", padding: "28px 20px" }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Finish Report</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Almost there! Tell us more about the issue.</p>
          </div>

          {error && <div style={{ marginBottom: 20, padding: "14px", borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", border: "1.5px solid rgba(239, 68, 68, 0.3)", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>⚠️ {error}</div>}

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>Issue Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {ISSUE_TYPES.map((type) => {
                const selected = issueType === type;
                return (
                  <button key={type} onClick={() => { setIssueType(type); if (!title) setTitle(type); }} style={{
                    padding: "14px 6px", borderRadius: 16, cursor: "pointer",
                    border: selected ? "2px solid #FF2E11" : "1.5px solid rgba(255,255,255,0.08)",
                    background: selected ? "rgba(255, 46, 17, 0.1)" : "rgba(255,255,255,0.02)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s"
                  }}>
                    <span style={{ fontSize: 22 }}>{ISSUE_EMOJIS[type]}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: selected ? "#FF2E11" : "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.2 }}>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Short Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Broken Water Pipe" style={{ width: "100%", padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)", fontSize: 14, color: "white", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Full Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide specific details about the issue..." rows={4} style={{ width: "100%", padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)", fontSize: 14, color: "white", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Exact Location</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
              <MapPin size={18} color="#FF2E11" />
              <input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Detecting..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "white" }} />
              <button onClick={detectLocation} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(255, 46, 17, 0.15)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#FF2E11" }}><Navigation size={12} /> Sync</button>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>Set Priority</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const selected = priority === p;
                return (
                  <button key={p} onClick={() => setPriority(p)} style={{ flex: 1, padding: "14px 0", borderRadius: 16, cursor: "pointer", background: selected ? cfg.bg : "rgba(255,255,255,0.02)", border: `1.5px solid ${selected ? cfg.color : "rgba(255,255,255,0.08)"}`, color: selected ? cfg.color : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 800, transition: "0.15s" }}>{p}</button>
                );
              })}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading || !issueType || !title || !description} style={{ width: "100%", padding: "18px 0", borderRadius: 18, background: loading || !issueType || !title || !description ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #FF2E11, #A79277)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: (loading || !issueType || !title || !description) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: loading ? "none" : "0 12px 32px rgba(255, 46, 17, 0.4)" }}>
            {loading ? <div style={{ width: 22, height: 22, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} /> : <><Send size={20} /> Submit Report</>}
          </button>
        </div>
      </div>
      
    </div>
  );
}
