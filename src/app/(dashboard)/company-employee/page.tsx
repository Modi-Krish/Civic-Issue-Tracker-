'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { CheckCircle2, Clock, MapPin, Camera, Briefcase, ExternalLink, Navigation, Play, Image as ImageIcon, Send, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/client-actions/notifications';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED: { label: "Reported", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  EMPLOYEE_ASSIGNED: { label: "Assigned To You", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
  COMPANY_EMPLOYEE_ASSIGNED: { label: "Assigned To You", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
  EMPLOYEE_ACCEPTED: { label: "Accepted", color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.15)" },
  TRAVELLING: { label: "Travelling to Site", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  IN_PROGRESS: { label: "Work In Progress", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending Admin Review", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  COMMUNITY_REVIEW: { label: "In Community Review", color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.15)" },
  REJECTED: { label: "Needs Rework", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  CLOSED: { label: "Resolved", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
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
              where('assigned_employee_id', '==', user.uid), 
              orderBy('created_at', 'desc')
            );
            unsubscribeSnap = onSnapshot(q, (snapshot) => {
              const tasksData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((t: any) => t.status !== 'CLOSED');
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
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 100 }}>
      {/* Ambient Backdrops */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: "10%", width: 400, height: 300, background: "radial-gradient(ellipse,rgba(59,130,246,0.06) 0%,transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -80, right: "10%", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(16,185,129,0.03) 0%,transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ padding: "40px 0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 14px", borderRadius: 99, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", width: "fit-content" }}>
            <Briefcase size={14} color="#3b82f6" />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Field Operations
            </span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>Field Employee Dashboard</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 15, fontWeight: 500 }}>Assigned field resolution workflow & task execution.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }}>

          {/* Task List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>MY ASSIGNED JOBS</h2>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{tasks.length} TOTAL</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite', margin: "0 auto 16px" }} />
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Syncing assignments...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)" }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Briefcase size={28} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No assigned tasks</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0, maxWidth: 300, marginInline: "auto" }}>Tasks assigned by your Company Admin will appear here.</p>
              </div>
            ) : (
              tasks.map(task => {
                const st = STATUS_STYLE[task.status] || STATUS_STYLE.REPORTED;
                return (
                  <div key={task.id} style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: st.color }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                        <Link href={`/issue?id=${task.id}`} style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8, color: "white", textDecoration: "none" }}>
                          {task.title}
                          <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
                        </Link>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                          <MapPin size={14} color="#3b82f6" /> {task.location_label || `${task.location_lat}, ${task.location_lng}`}
                        </p>
                      </div>
                      <span style={{ padding: "6px 12px", borderRadius: 10, background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, border: `1px solid ${st.color}25`, whiteSpace: "nowrap" }}>
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
                          style={{ flex: 1, padding: "12px 18px", borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <CheckCircle2 size={16} /> Accept Issue
                        </button>
                      )}

                      {/* STEP 2: Travel */}
                      {task.status === 'EMPLOYEE_ACCEPTED' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'TRAVELLING')}
                          disabled={updating}
                          style={{ flex: 1, padding: "12px 18px", borderRadius: 12, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Navigation size={16} /> Start Travel to Site
                        </button>
                      )}

                      {/* STEP 3: Before Photos & Start Work */}
                      {task.status === 'TRAVELLING' && (
                        <button
                          onClick={() => setActiveTask({ ...task, mode: 'BEFORE_PHOTOS' })}
                          disabled={updating}
                          style={{ flex: 1, padding: "12px 18px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Camera size={16} /> Upload Before Photos & Start Work
                        </button>
                      )}

                      {/* STEP 4 & 5: In Progress & Complete */}
                      {task.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => setActiveTask({ ...task, mode: 'PROGRESS' })}
                            style={{ flex: 1, padding: "12px 18px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <ImageIcon size={16} /> Add Progress Photo
                          </button>
                          <button
                            onClick={() => setActiveTask({ ...task, mode: 'AFTER_PHOTOS' })}
                            style={{ flex: 1, padding: "12px 18px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <CheckCircle2 size={16} /> Complete Work & Submit
                          </button>
                        </>
                      )}

                      {task.status === 'SUBMITTED_FOR_APPROVAL' && (
                        <div style={{ width: "100%", padding: 12, borderRadius: 12, background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#a855f7", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
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
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 28, border: "1.5px solid rgba(255,255,255,0.05)", padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>WORKFLOW STEPS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#0ea5e9", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>1</span>
                <span>Accept Assigned Issue</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#f59e0b", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>2</span>
                <span>Travel to Site</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>3</span>
                <span>Upload Before Photos & Start</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#10b981", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>4</span>
                <span>Upload After Photos & Complete</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal for Photo Uploads */}
      {activeTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#121215", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, width: "100%", maxWidth: 480, padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>
              {activeTask.mode === 'BEFORE_PHOTOS' ? 'Upload Before Photos & Start Work' : activeTask.mode === 'PROGRESS' ? 'Upload Progress Update' : 'Upload After Photos & Complete Work'}
            </h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>{activeTask.title}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 8 }}>
                  Upload Photo File
                </label>

                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "24px",
                  borderRadius: 16,
                  border: "2px dashed rgba(16, 185, 129, 0.4)",
                  background: "rgba(16, 185, 129, 0.05)",
                  cursor: "pointer",
                  textAlign: "center"
                }}>
                  <Camera size={32} color="#10b981" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>
                    {selectedFile ? selectedFile.name : "Click here to choose image file"}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Select photo from device / camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>

                {(filePreview || (activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl)) && (
                  <div style={{ marginTop: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>SELECTED PHOTO PREVIEW</div>
                    <img 
                      src={filePreview || (activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl)} 
                      alt="Preview" 
                      style={{ width: "100%", maxHeight: 180, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }} 
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => { setActiveTask(null); setSelectedFile(null); setFilePreview(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
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
                  style={{ flex: 2, padding: 12, borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", opacity: (!filePreview && !(activeTask.mode === 'BEFORE_PHOTOS' ? photoInput.beforeUrl : activeTask.mode === 'PROGRESS' ? photoInput.progressUrl : photoInput.afterUrl)) ? 0.5 : 1 }}>
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
