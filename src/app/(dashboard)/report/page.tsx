'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { submitIssue } from '@/lib/client-actions/issue';
import { ISSUE_TYPES, ISSUE_TYPE_TO_DEPARTMENT, type IssueType } from '@/lib/types/database';
import { Camera, MapPin, ArrowLeft, X, Send, Navigation, CheckCircle2 } from 'lucide-react';
import { takePhoto as nativeTakePhoto } from '@/lib/capacitor/camera';
import { getCurrentPosition } from '@/lib/capacitor/geolocation';
import { isNativePlatform } from '@/lib/capacitor/platform';
import { useImageUpload } from '@/hooks/useImageUpload';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  base:       '#EDEBE4',
  raised:     '#F5F3EC',
  border:     '#DDD9CE',
  text1:      '#2C2C2A',
  text2:      '#5F5E5A',
  text3:      '#888780',
  accent:     '#1D9E75',
  accentDark: '#167A5B',
  accentTint: '#E1F5EE',
  shL: 'rgba(255,255,255,0.75)',
  shD: 'rgba(0,0,0,0.09)',
} as const;

const SH = {
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

type Step = 'photo' | 'details';

const ISSUE_EMOJIS: Record<string, string> = {
  'Road Damage': '🚧', 'Water Leakage': '💧', 'Electricity Fault': '⚡',
  'Sanitation': '🧹', 'Streetlight': '💡', 'Drainage': '🌊', 'Other': '⚠️',
};

// Dept-color chips for category selector
const ISSUE_META: Record<string, { bg: string; fg: string }> = {
  'Road Damage':       { bg: '#E6F1FB', fg: '#0C447C' },
  'Water Leakage':     { bg: '#EAF3DE', fg: '#27500A' },
  'Electricity Fault': { bg: '#FAEEDA', fg: '#854F0B' },
  'Sanitation':        { bg: '#FAECE7', fg: '#712B13' },
  'Streetlight':       { bg: '#FAEEDA', fg: '#854F0B' },
  'Drainage':          { bg: '#EAF3DE', fg: '#27500A' },
  'Other':             { bg: '#EEEDFE', fg: '#3C3489' },
};

const PRIORITY_CONFIG = {
  Low:    { color: '#27500A', bg: '#EAF3DE', label: 'Low' },
  Medium: { color: '#854F0B', bg: '#FAEEDA', label: 'Medium' },
  High:   { color: '#791F1F', bg: '#FCEBEB', label: 'High' },
};

// Shared input style
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 14,
  background: T.raised, border: `1px solid ${T.border}`,
  boxShadow: SH.insetSoft,
  fontSize: 14, color: T.text1, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: T.text3,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  display: 'block', marginBottom: 10,
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

  const { uploadImage } = useImageUpload({ cityId: 'vadodara', type: 'before' });

  async function handleSubmit() {
    if (!imageFile || !issueType || !title || !description) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const imageMetadata = await uploadImage(imageFile);
      if (!imageMetadata) throw new Error('Image upload failed.');
      try {
        let department_id = null;
        if (issueType === 'Road Damage') department_id = 'roads';
        else if (issueType === 'Water Leakage') department_id = 'water';
        else if (issueType === 'Electricity Fault' || issueType === 'Streetlight') department_id = 'electricity';
        else if (issueType === 'Sanitation' || issueType === 'Drainage') department_id = 'sanitation';

        const docRef = await addDoc(collection(db, 'issues'), {
          title, description, issue_type: issueType, department_id,
          location_lat: locationLat, location_lng: locationLng,
          location_label: locationLabel, image: imageMetadata,
          status: 'REPORTED',
          reporter_id: auth.currentUser?.uid || 'anonymous',
          created_at: new Date().toISOString(),
        });
        router.push(`/issue?id=${docRef.id}`);
      } catch (firestoreError: any) {
        console.error('Failed to save to Firestore:', firestoreError);
        throw new Error('Failed to submit issue details. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1: Photo ──────────────────────────────────────────────────────────
  if (step === 'photo') {
    return (
      <div style={{ minHeight: '100dvh', background: T.base, fontFamily: "'Inter',-apple-system,sans-serif", color: T.text1 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 0 32px' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                width: 40, height: 40, borderRadius: 13,
                background: T.raised, border: `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: SH.raisedSm,
              }}
            >
              <ArrowLeft size={18} color={T.text2} />
            </button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', margin: 0, color: T.text1 }}>
                Report Issue
              </h1>
              <p style={{ fontSize: 11, color: T.accent, fontWeight: 700, margin: '3px 0 0' }}>
                HELP IMPROVE YOUR CITY 🌱
              </p>
            </div>
          </div>

          {/* Upload zone */}
          <div style={{
            borderRadius: 28, padding: '48px 28px', textAlign: 'center',
            background: T.raised, boxShadow: SH.raised,
            border: `2px dashed ${T.accent}55`,
          }}>
            <div style={{
              width: 88, height: 88, borderRadius: 24, margin: '0 auto 24px',
              background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `${SH.raisedSm}, 0 8px 24px ${T.accent}40`,
            }}>
              <Camera size={36} color="white" />
            </div>

            <p style={{ fontSize: 19, fontWeight: 800, color: T.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Take an Issue Photo
            </p>
            <p style={{ fontSize: 13, color: T.text3, margin: '0 0 32px', lineHeight: 1.5 }}>
              A clear photo helps the team understand the problem faster.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              {isNativePlatform() ? (
                <button onClick={handleNativeCamera} style={{
                  flex: 1, padding: '14px 0', borderRadius: 16,
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  color: 'white', fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer', boxShadow: SH.raisedSm,
                  fontFamily: 'inherit',
                }}>📷 Take Photo</button>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} style={{
                  flex: 1, padding: '14px 0', borderRadius: 16,
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  color: 'white', fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer', boxShadow: SH.raisedSm,
                  fontFamily: 'inherit',
                }}>📷 Take Photo</button>
              )}
              <button onClick={() => fileInputRef.current?.click()} style={{
                flex: 1, padding: '14px 0', borderRadius: 16,
                background: T.raised, color: T.accent,
                fontSize: 13, fontWeight: 700, border: `1.5px solid ${T.accent}55`,
                cursor: 'pointer', boxShadow: SH.raisedSm,
                fontFamily: 'inherit',
              }}>📁 Upload</button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageSelect} />
          </div>

          {/* Tips card */}
          <div style={{
            marginTop: 20, borderRadius: 18, padding: '16px 20px',
            background: T.accentTint, border: `1px solid ${T.accent}30`,
            boxShadow: SH.raisedSm,
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
              Submission Tips
            </p>
            {['Use good lighting', 'Capture surroundings for context', 'Ensure issue is centered'].map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 7 : 0 }}>
                <CheckCircle2 size={13} color={T.accent} />
                <span style={{ fontSize: 12, color: '#085041' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Details ────────────────────────────────────────────────────────
  const canSubmit = !!issueType && !!title && !!description && !loading;

  return (
    <div style={{ minHeight: '100dvh', background: T.base, fontFamily: "'Inter',-apple-system,sans-serif", color: T.text1, paddingBottom: 40 }}>
      {/* Photo header */}
      <div style={{ position: 'relative', height: 240, overflow: 'hidden', background: T.border }}>
        {imagePreview && (
          <Image src={imagePreview} alt="Issue preview" fill unoptimized style={{ objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />
        <button onClick={() => setStep('photo')} style={{
          position: 'absolute', top: 16, left: 16, width: 40, height: 40,
          borderRadius: 13, background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ArrowLeft size={20} color="white" />
        </button>
        <button onClick={() => { setImageFile(null); setImagePreview(null); setStep('photo'); }} style={{
          position: 'absolute', top: 16, right: 16, width: 40, height: 40,
          borderRadius: 13, background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <X size={20} color="white" />
        </button>
        <div style={{
          position: 'absolute', bottom: 18, left: 18,
          background: `${T.accent}EE`, borderRadius: 99,
          padding: '5px 14px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.1em',
        }}>
          DETAILS FORM
        </div>
      </div>

      {/* Sheet */}
      <div style={{ marginTop: -24, borderRadius: '28px 28px 0 0', background: T.base, padding: '24px 20px' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px', color: T.text1 }}>
              Finish Report
            </h2>
            <p style={{ fontSize: 13, color: T.text3 }}>Almost there! Tell us more about the issue.</p>
          </div>

          {error && (
            <div style={{
              marginBottom: 20, padding: 14, borderRadius: 14,
              background: '#FCEBEB', fontSize: 13, color: '#791F1F', fontWeight: 700,
              boxShadow: SH.raisedSm,
            }}>⚠️ {error}</div>
          )}

          {/* Category */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Issue Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {ISSUE_TYPES.map((type) => {
                const selected = issueType === type;
                const m = ISSUE_META[type] ?? ISSUE_META['Other'];
                return (
                  <button key={type} onClick={() => { setIssueType(type); if (!title) setTitle(type); }} style={{
                    padding: '14px 6px', borderRadius: 18, cursor: 'pointer',
                    border: selected ? `2px solid ${m.fg}55` : `1px solid ${T.border}`,
                    background: selected ? m.bg : T.raised,
                    boxShadow: selected ? SH.insetSoft : SH.raisedSm,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 22 }}>{ISSUE_EMOJIS[type]}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: selected ? m.fg : T.text3, textAlign: 'center', lineHeight: 1.2 }}>
                      {type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Short Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Broken Water Pipe" style={inputStyle} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Full Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Provide specific details about the issue..." rows={4}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
          </div>

          {/* Location */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Exact Location</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderRadius: 14, background: T.raised, border: `1px solid ${T.border}`,
              boxShadow: SH.insetSoft,
            }}>
              <MapPin size={18} color={T.accent} style={{ flexShrink: 0 }} />
              <input value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                placeholder="Detecting..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: T.text1, fontFamily: 'inherit' }} />
              <button onClick={detectLocation} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                borderRadius: 10, background: T.accentTint, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 800, color: T.accent,
                boxShadow: SH.raisedSm, fontFamily: 'inherit',
              }}>
                <Navigation size={12} /> Sync
              </button>
            </div>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>Set Priority</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                const selected = priority === p;
                return (
                  <button key={p} onClick={() => setPriority(p)} style={{
                    flex: 1, padding: '14px 0', borderRadius: 16, cursor: 'pointer',
                    background: selected ? cfg.bg : T.raised,
                    border: selected ? `2px solid ${cfg.color}55` : `1px solid ${T.border}`,
                    color: selected ? cfg.color : T.text3,
                    fontSize: 13, fontWeight: 800,
                    boxShadow: selected ? SH.insetSoft : SH.raisedSm,
                    fontFamily: 'inherit',
                  }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 18,
              background: canSubmit ? `linear-gradient(145deg, ${T.accent}, ${T.accentDark})` : T.raised,
              border: 'none', color: canSubmit ? 'white' : T.text3,
              fontSize: 16, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              boxShadow: canSubmit ? `${SH.raisedSm}, 0 8px 24px ${T.accent}40` : SH.insetSoft,
              fontFamily: 'inherit',
            }}
          >
            {loading ? (
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `3px solid rgba(255,255,255,0.3)`, borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <><Send size={20} /> Submit Report</>
            )}
          </button>
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        </div>
      </div>
    </div>
  );
}
