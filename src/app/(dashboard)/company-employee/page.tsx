'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { CheckCircle2, Clock, MapPin, Camera, Briefcase, ExternalLink, Navigation, Play, Image as ImageIcon, Send, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/client-actions/notifications';

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
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  insetSoft:`inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED: { label: "Reported", color: "#0C447C", bg: "#E6F1FB" },
  EMPLOYEE_ASSIGNED: { label: "Assigned To You", color: "#3C3489", bg: "#EEEDFE" },
  COMPANY_EMPLOYEE_ASSIGNED: { label: "Assigned To You", color: "#3C3489", bg: "#EEEDFE" },
  EMPLOYEE_ACCEPTED: { label: "Accepted", color: "#0C447C", bg: "#E6F1FB" },
  TRAVELLING: { label: "Travelling to Site", color: "#854F0B", bg: "#FAEEDA" },
  IN_PROGRESS: { label: "Work In Progress", color: "#27500A", bg: "#EAF3DE" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending Admin Review", color: "#854F0B", bg: "#FAEEDA" },
  COMMUNITY_REVIEW: { label: "In Community Review", color: "#854F0B", bg: "#FAEEDA" },
  REJECTED: { label: "Needs Rework", color: "#791F1F", bg: "#FCEBEB" },
  CLOSED: { label: "Resolved", color: "#085041", bg: "#E1F5EE" },
};

export default function CompanyEmployeeDashboard() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [photoInput, setPhotoInput] = useState({ beforeUrl: '', progressUrl: '', afterUrl: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setFilePreview(result);
        if (activeTask?.mode === 'BEFORE_PHOTOS') setPhotoInput(prev => ({ ...prev, beforeUrl: result }));
        else if (activeTask?.mode === 'PROGRESS') setPhotoInput(prev => ({ ...prev, progressUrl: result }));
        else setPhotoInput(prev => ({ ...prev, afterUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    let unsubscribeSnap: any = null;
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        import('firebase/firestore').then(({ collection, query, where, onSnapshot, orderBy }) => {
          import('@/lib/firebase').then(({ db }) => {
            const q = query(
              collection(db, 'issues'), 
              where('assigned_employee_id', '==', user.uid)
            );
            unsubscribeSnap = onSnapshot(q, (snapshot) => {
              const tasksData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((t: any) => t.status !== 'CLOSED');
              tasksData.sort((a: any, b: any) => (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0));
              setTasks(tasksData);
              setLoading(false);
            }, (error) => {
              console.error('Error fetching employee tasks:', error);
              setLoading(false);
            });
          });
        });
      } else {
        setTasks([]);
        setLoading(false);
        if (unsubscribeSnap) unsubscribeSnap();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, []);

  const updateTaskStatus = async (taskId: string, newStatus: string, extraData: any = {}) => {
    setUpdating(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      await updateDoc(doc(db, 'issues', taskId), {
        status: newStatus,
        updated_at: serverTimestamp(),
        ...extraData
      });

      // Send notification to Company Admin if completed
      if (newStatus === 'SUBMITTED_FOR_APPROVAL') {
        const user = auth.currentUser;
        if (user) {
          await sendSystemNotification({
            userId: user.uid,
            title: 'Field Work Submitted',
            body: 'Work completed and submitted for Company Admin review.',
            type: 'status_updated',
            issueId: taskId
          });
        }
      }

      setActiveTask(null);
      setPhotoInput({ beforeUrl: '', progressUrl: '', afterUrl: '' });
    } catch (err: any) {
      alert("Failed to update task: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter', sans-serif", color: T.text1, paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))", overflowX: "hidden" }}>
      <style>{`
        .ce-inner { width: 100%; padding: 0 16px; }
        @media (min-width: 768px) { .ce-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; } }
        .ce-main-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 1024px) { .ce-main-grid { grid-template-columns: 1.5fr 1fr; align-items: start; } }
      `}</style>
      <div className="ce-inner">

        {/* Header */}
        <div style={{ padding: "24px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "5px 12px", borderRadius: 99, background: "#EEEDFE", border: `1px solid ${T.border}`, width: "fit-content", boxShadow: SH.raisedSm }}>
            <Briefcase size={13} color="#3C3489" />
            <span style={{ fontSize: 10, fontWeight: 900, color: "#3C3489", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Field Operations
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px", color: T.text1, lineHeight: 1.2 }}>Field Employee Dashboard</h1>
          <p style={{ color: T.text3, margin: 0, fontSize: 13, fontWeight: 600 }}>Assigned field resolution workflow & task execution.</p>
        </div>

        <div className="ce-main-grid">

          {/* Task List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ fontSize: 13, fontWeight: 900, color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>MY ASSIGNED JOBS</h2>
              <span style={{ fontSize: 12, color: T.text3, fontWeight: 800 }}>{tasks.length} TOTAL</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: T.raised, borderRadius: 24, border: `1px solid ${T.border}`, boxShadow: SH.raised }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite', margin: "0 auto 16px" }} />
                <div style={{ fontSize: 14, color: T.text3, fontWeight: 700 }}>Syncing assignments...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", background: T.raised, borderRadius: 24, border: `2px dashed ${T.border}`, boxShadow: SH.insetSoft }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: SH.raisedSm }}>
                  <Briefcase size={28} color={T.accent} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px", color: T.text1 }}>No assigned tasks</h3>
                <p style={{ fontSize: 14, color: T.text3, margin: 0, maxWidth: 300, marginInline: "auto", fontWeight: 500 }}>Tasks assigned by your Company Admin will appear here.</p>
              </div>
            ) : (
              tasks.map(task => {
                const st = STATUS_STYLE[task.status] || STATUS_STYLE.REPORTED;
                return (
                  <div key={task.id} style={{ padding: 24, borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, position: "relative", overflow: "hidden", boxShadow: SH.raised }}>
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: st.color }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                        <Link href={`/issue?id=${task.id}`} style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8, color: T.text1, textDecoration: "none", letterSpacing: '-0.02em' }}>
                          {task.title}
                          <ExternalLink size={14} color={T.text3} />
                        </Link>
                        <p style={{ fontSize: 13, color: T.text2, margin: 0, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                          <MapPin size={14} color={T.accent} /> {task.location_label || `${task.location_lat}, ${task.location_lng}`}
                        </p>
                      </div>
                      <span style={{ padding: "6px 12px", borderRadius: 10, background: st.bg, color: st.color, fontSize: 10, fontWeight: 900, border: `1px solid ${st.color}25`, whiteSpace: "nowrap", boxShadow: SH.raisedSm }}>
                        {st.label.toUpperCase()}
                      </span>
                    </div>

                    {/* Step Controls */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>

                      {/* STEP 1: Accept */}
                      {(task.status === 'EMPLOYEE_ASSIGNED' || task.status === 'COMPANY_EMPLOYEE_ASSIGNED' || task.status === 'REJECTED') && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'EMPLOYEE_ACCEPTED')}
                          disabled={updating}
                          style={{ flex: 1, padding: "12px 18px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                          <CheckCircle2 size={16} /> Accept Issue
                        </button>
                      )}

                      {/* STEP 2: Travel */}
                      {task.status === 'EMPLOYEE_ACCEPTED' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'TRAVELLING')}
                          disabled={updating}
                          style={{ flex: 1, padding: "12px 18px", borderRadius: 14, background: "linear-gradient(135deg, #854F0B, #712B13)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: SH.raisedSm }}>
                          <Navigation size={16} /> Start Travel to Site
                        </button>
                      )}

                      {/* STEP 3: Before Photos & Start Work */}
                      {task.status === 'TRAVELLING' && (
                        <button
                          onClick={() => setActiveTask({ ...task, mode: 'BEFORE_PHOTOS' })}
                          disabled={updating}
                          style={{ flex: 1, padding: "12px 18px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                          <Camera size={16} /> Upload Before Photos & Start Work
                        </button>
                      )}

                      {/* STEP 4 & 5: In Progress & Complete */}
                      {task.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => setActiveTask({ ...task, mode: 'PROGRESS' })}
                            style={{ flex: 1, padding: "12px 18px", borderRadius: 14, background: T.base, border: `1px solid ${T.border}`, color: T.text1, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: SH.raisedSm }}>
                            <ImageIcon size={16} color={T.accent} /> Add Progress Photo
                          </button>
                          <button
                            onClick={() => setActiveTask({ ...task, mode: 'AFTER_PHOTOS' })}
                            style={{ flex: 1, padding: "12px 18px", borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                            <CheckCircle2 size={16} /> Complete Work & Submit
                          </button>
                        </>
                      )}

                      {task.status === 'SUBMITTED_FOR_APPROVAL' && (
                        <div style={{ width: "100%", padding: 14, borderRadius: 14, background: "#FAEEDA", border: "1px solid #854F0B30", color: "#854F0B", fontSize: 12, fontWeight: 800, textAlign: "center", boxShadow: SH.insetSoft }}>
                          ⏳ Submitted for Company Admin Review
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Info */}
          <div style={{ background: T.raised, borderRadius: 28, border: `1px solid ${T.border}`, padding: 28, boxShadow: SH.raised }}>
            <h2 style={{ fontSize: 13, fontWeight: 900, margin: "0 0 16px", color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>WORKFLOW STEPS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13, color: T.text2, fontWeight: 600 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB", color: "#0C447C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, boxShadow: SH.raisedSm }}>1</span>
                <span>Accept Assigned Issue</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#FAEEDA", color: "#854F0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, boxShadow: SH.raisedSm }}>2</span>
                <span>Travel to Site</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB", color: "#0C447C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, boxShadow: SH.raisedSm }}>3</span>
                <span>Upload Before Photos & Start</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#E1F5EE", color: "#085041", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, boxShadow: SH.raisedSm }}>4</span>
                <span>Upload After Photos & Complete</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal for Photo Uploads */}
      {activeTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,44,42,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 28, width: "100%", maxWidth: 480, padding: 32, boxShadow: SH.raised }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", color: T.text1, letterSpacing: '-0.02em' }}>
              {activeTask.mode === 'BEFORE_PHOTOS' ? 'Upload Before Photos & Start Work' : activeTask.mode === 'PROGRESS' ? 'Upload Progress Update' : 'Upload After Photos & Complete Work'}
            </h3>
            <p style={{ fontSize: 13, color: T.text3, margin: "0 0 24px", fontWeight: 600 }}>{activeTask.title}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", marginBottom: 10, letterSpacing: '0.05em' }}>
                  Upload Photo File
                </label>

                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "32px", borderRadius: 20, border: `2px dashed ${T.accent}80`, background: T.base, cursor: "pointer", textAlign: "center", boxShadow: SH.insetSoft
                }}>
                  <Camera size={36} color={T.accent} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: T.text1 }}>
                    {selectedFile ? selectedFile.name : "Click here to choose image file"}
                  </span>
                  <span style={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>Select photo from device / camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>

                {(filePreview || (activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl)) && (
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SELECTED PHOTO PREVIEW</div>
                    <img 
                      src={filePreview || (activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl)} 
                      alt="Preview" 
                      style={{ width: "100%", maxHeight: 200, borderRadius: 16, objectFit: "cover", border: `1px solid ${T.border}`, boxShadow: SH.raisedSm }} 
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => { setActiveTask(null); setSelectedFile(null); setFilePreview(null); }} style={{ flex: 1, padding: 14, borderRadius: 14, background: T.base, border: `1px solid ${T.border}`, color: T.text1, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: SH.raisedSm }}>Cancel</button>
                <button
                  type="button"
                  disabled={updating || (!filePreview && !(activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl))}
                  onClick={() => {
                    const currentUrl = filePreview || (activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl);
                    if (activeTask.mode === 'BEFORE_PHOTOS') {
                      updateTaskStatus(activeTask.id, 'IN_PROGRESS', { before_image_path: currentUrl });
                    } else if (activeTask.mode === 'PROGRESS') {
                      updateTaskStatus(activeTask.id, 'IN_PROGRESS', { progress_image_path: currentUrl });
                    } else {
                      updateTaskStatus(activeTask.id, 'SUBMITTED_FOR_APPROVAL', { after_image_path: currentUrl });
                    }
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  style={{ flex: 2, padding: 14, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", opacity: (!filePreview && !(activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl)) ? 0.5 : 1, boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40` }}>
                  {updating ? 'Uploading...' : 'Confirm Step'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
