'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, AlertTriangle, ArrowRight, Heart, Camera, Check } from 'lucide-react';

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
  shD: "rgba(0,0,0,0.09)",
};

const CATEGORIES = [
  { id: "Road Damage", emoji: "🚧", label: "Road Damage" },
  { id: "Water Leakage", emoji: "💧", label: "Water Leakage" },
  { id: "Electricity Fault", emoji: "⚡", label: "Electricity Fault" },
  { id: "Sanitation", emoji: "🧹", label: "Sanitation" },
  { id: "Streetlight", emoji: "💡", label: "Streetlight" },
  { id: "Drainage", emoji: "🌊", label: "Drainage" },
  { id: "Other", emoji: "📋", label: "Other" },
];

export default function SmartReportModal({ 
  isOpen, 
  onClose, 
  user 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: any;
}) {
  const [step, setStep] = useState<'CATEGORY' | 'DUPLICATE_CHECK' | 'FORM'>('CATEGORY');
  const [category, setCategory] = useState<string | null>(null);
  
  // Location states
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  // Duplicate check states
  const [checking, setChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('CATEGORY');
      setCategory(null);
      setDuplicates([]);
      setTitle('');
      setDesc('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Haversine distance calculation (in meters)
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCategorySelect = async (cat: string) => {
    setCategory(cat);
    setStep('DUPLICATE_CHECK');
    setChecking(true);

    // Get location
    let currentLat: number | null = null;
    let currentLng: number | null = null;

    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
        setLat(currentLat);
        setLng(currentLng);
      }
    } catch (e) {
      console.warn("Location permission denied or timeout.");
    }

    // If no location, skip duplicate check and go straight to form
    if (currentLat === null || currentLng === null) {
      setChecking(false);
      setStep('FORM');
      return;
    }

    // Query Firestore for unresolved issues of same category nearby
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const q = query(
        collection(db, 'issues'),
        where('issue_type', '==', cat)
        // Note: Real bounding box query should be used here, but for now we filter all open issues of this type in client.
      );
      
      const snap = await getDocs(q);
      const possibleDups: any[] = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'CLOSED' && data.status !== 'COMPLETED' && data.status !== 'APPROVED') {
          if (data.location_lat && data.location_lng) {
            const dist = getDistanceMeters(currentLat, currentLng, data.location_lat, data.location_lng);
            if (dist <= 100) {
              possibleDups.push({ id: doc.id, dist, ...data });
            }
          }
        }
      });
      
      setDuplicates(possibleDups.sort((a, b) => a.dist - b.dist));
    } catch (error) {
      console.error("Error checking duplicates:", error);
    } finally {
      setChecking(false);
      // If no duplicates, immediately go to form
      if (duplicates.length === 0) {
        // Wait briefly just to let the user see a loading state (UX)
        setTimeout(() => setStep('FORM'), 500);
      }
    }
  };

  const handleSupportIssue = async (issueId: string) => {
    // Add user to supporters list and increment support count
    try {
      setSubmitting(true);
      const { doc, updateDoc, increment, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const ref = doc(db, 'issues', issueId);
      await updateDoc(ref, {
        support_count: increment(1),
        supporters: arrayUnion(user.uid)
      });
      alert('Issue supported! You will be notified of updates.');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to support issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!title) return alert("Title is required.");
    try {
      setSubmitting(true);
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      await addDoc(collection(db, 'issues'), {
        title,
        description: desc,
        issue_type: category,
        status: 'REPORTED',
        reporter_id: user.uid,
        location_lat: lat,
        location_lng: lng,
        location_label: '',
        created_at: serverTimestamp(),
        support_count: 1,
      });
      
      alert('Report submitted successfully!');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        width: '100%', maxWidth: 600,
        backgroundColor: T.raised,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '24px 20px 40px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: `0 -10px 40px ${T.shD}`,
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: T.text1 }}>
            {step === 'CATEGORY' && "What are you reporting?"}
            {step === 'DUPLICATE_CHECK' && "Checking Nearby Issues..."}
            {step === 'FORM' && "Details for " + category}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, color: T.text2 }}>
            <X size={24} />
          </button>
        </div>

        {/* STEP 1: CATEGORY */}
        {step === 'CATEGORY' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => handleCategorySelect(cat.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 12px', borderRadius: 16, background: T.base,
                border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 32 }}>{cat.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{cat.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: DUPLICATE CHECK */}
        {step === 'DUPLICATE_CHECK' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {checking ? (
               <div>
                 <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                 <p style={{ color: T.text2, fontWeight: 600 }}>Scanning within 100m...</p>
                 <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
               </div>
            ) : duplicates.length > 0 ? (
               <div style={{ textAlign: 'left' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#FEF3C7', borderRadius: 16, marginBottom: 20 }}>
                   <AlertTriangle color="#D97706" size={24} />
                   <div>
                     <div style={{ fontWeight: 800, color: '#92400E', fontSize: 15 }}>Wait! Is it one of these?</div>
                     <div style={{ fontSize: 12, color: '#B45309' }}>We found similar {category} issues nearby. Supporting an existing issue gets it resolved faster!</div>
                   </div>
                 </div>

                 {duplicates.map(dup => (
                   <div key={dup.id} style={{ background: T.base, padding: 16, borderRadius: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
                     <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{dup.title}</div>
                     <div style={{ fontSize: 12, color: T.text2, marginBottom: 12 }}>Approx. {Math.round(dup.dist)}m away • {dup.support_count || 1} supporters</div>
                     <button onClick={() => handleSupportIssue(dup.id)} disabled={submitting} style={{
                       width: '100%', padding: '12px', borderRadius: 12, background: T.accent, color: 'white',
                       fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
                     }}>
                       <Heart size={16} /> Support This Issue
                     </button>
                   </div>
                 ))}

                 <div style={{ margin: '24px 0', borderTop: `1px solid ${T.border}` }} />
                 
                 <button onClick={() => setStep('FORM')} style={{
                   width: '100%', padding: '12px', borderRadius: 12, background: 'transparent', color: T.text2,
                   fontWeight: 800, border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
                 }}>
                   No, my issue is different <ArrowRight size={16} />
                 </button>
               </div>
            ) : null}
          </div>
        )}

        {/* STEP 3: FORM */}
        {step === 'FORM' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>Title</label>
              <input 
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Briefly describe the issue"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${T.border}`, background: T.base, fontSize: 15, outline: 'none' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>Description (Optional)</label>
              <textarea 
                rows={4} value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Add more details..."
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${T.border}`, background: T.base, fontSize: 15, outline: 'none', resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>Photo</label>
              <button style={{
                width: '100%', padding: '20px', borderRadius: 12, background: T.base, border: `2px dashed ${T.border}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', color: T.text2
              }}>
                <Camera size={24} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tap to upload or take photo</span>
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>Location</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: T.base, border: `1px solid ${T.border}`, fontSize: 13, color: T.text1, fontWeight: 600 }}>
                <MapPin size={16} color={T.accent} />
                {lat && lng ? `Captured (${lat.toFixed(4)}, ${lng.toFixed(4)})` : "Finding location..."}
              </div>
            </div>

            <button 
              onClick={handleSubmitReport} disabled={submitting || !title}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, background: (!title || submitting) ? T.border : T.accent, 
                color: (!title || submitting) ? T.text3 : 'white', fontWeight: 800, fontSize: 16, border: 'none', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginTop: 8
            }}>
              {submitting ? 'Submitting...' : 'Submit Report'} <Check size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
