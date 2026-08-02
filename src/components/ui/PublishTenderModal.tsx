import React, { useState, useRef, useEffect } from "react";
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";

// ─── Design Tokens ────────────────────────────────────────────────────────────

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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22 11 13 2 9l20-7z" />
  </svg>
);

const IconCheckmark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Reusable Components ───────────────────────────────────────────────────────

function RadioOption({ id, value, label, checked, onChange }: any) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: checked ? T.accentTint : T.raised,
        border: checked ? "none" : `1px solid ${T.border}`,
        boxShadow: checked ? SH.insetSoft : SH.raisedSm,
        borderRadius: 14, padding: "14px 16px", cursor: "pointer",
        fontSize: 13, color: checked ? T.accentDark : T.text2, fontWeight: 800,
        transition: "all 0.15s",
      }}
    >
      <input
        type="radio" id={id} value={value} checked={checked}
        onChange={() => onChange(value)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `2px solid ${checked ? T.accent : T.border}`,
        background: T.base, boxShadow: SH.insetSoft,
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.15s",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: T.accent,
          opacity: checked ? 1 : 0, transition: "opacity 0.15s",
        }} />
      </div>
      {label}
    </label>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontSize: 11, fontWeight: 900,
      color: T.text3, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase"
    }}>
      {children}
    </label>
  );
}

const inputStyle = (hasError = false) => ({
  width: "100%", background: T.raised,
  border: `1px solid ${hasError ? "#791F1F" : T.border}`,
  boxShadow: SH.insetSoft,
  borderRadius: 14, color: T.text1, fontSize: 14, fontWeight: 700,
  fontFamily: "inherit", padding: "14px 16px",
  outline: "none", transition: "all 0.15s",
  boxSizing: "border-box" as any
});

// ─── Publish Tender Modal ─────────────────────────────────────────────────────

const TENDER_TYPES = [
  { id: "typeOpen",      value: "Open Tender",      label: "Open Tender" },
  { id: "typeLimited",   value: "Limited Tender",   label: "Limited Tender" },
  { id: "typeEmergency", value: "Emergency Tender", label: "Emergency Tender" },
  { id: "typeAMC",       value: "Annual Maintenance Contract",       label: "Annual Maintenance Contract" },
];

export default function PublishTenderModal({ isOpen, onClose, departmentId }: { isOpen: boolean, onClose: () => void, departmentId: string }) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    tenderTitle: "", tenderType: "Open Tender", bidDeadline: "",
    budget: "", emd: "", startDate: "", endDate: "",
    description: "", scopeOfWork: "",
  });
  const [titleError, setTitleError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const set = (field: string) => (e: any) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setType = (value: string) =>
    setForm((prev) => ({ ...prev, tenderType: value }));

  const handleSubmit = async () => {
    if (!form.tenderTitle.trim()) {
      setTitleError(true);
      setTimeout(() => setTitleError(false), 2000);
      return;
    }
    
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tenders/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          title: form.tenderTitle,
          description: form.description,
          scopeOfWork: form.scopeOfWork,
          tenderType: form.tenderType,
          budget: form.budget,
          emd: form.emd,
          startDate: form.startDate,
          endDate: form.endDate,
          bidDeadline: form.bidDeadline
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to publish tender via API.");
      }

      setShowSuccess(true);
      if (sheetRef.current) sheetRef.current.scrollTop = 0;
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setForm({
          tenderTitle: "", tenderType: "Open Tender", bidDeadline: "",
          budget: "", emd: "", startDate: "", endDate: "",
          description: "", scopeOfWork: "",
        });
        window.location.reload(); // Quick refresh to show new tender count
      }, 3000);
    } catch (err) {
      console.error("Error publishing tender:", err);
      alert("Error publishing tender. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: any) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
        opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "all" : "none",
        transition: "opacity 0.25s",
      }}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      <div
        ref={sheetRef}
        className="no-scrollbar"
        style={{
          background: T.base, borderRadius: "32px 32px 0 0",
          borderTop: `1px solid ${T.border}`, width: "100%", maxWidth: 720,
          maxHeight: "92vh", overflowY: "auto", paddingBottom: 120,
          boxShadow: SH.raised,
          transform: isOpen ? "translateY(0)" : "translateY(100px)",
          transition: "transform 0.28s cubic-bezier(0.25,0.8,0.25,1)",
        }}
      >
        {/* Sheet Header */}
        <div style={{
          position: "sticky", top: 0, background: T.base,
          borderBottom: `1px solid ${T.border}`, padding: "32px 32px 24px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", zIndex: 5,
        }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: T.text1, margin: "0 0 8px", letterSpacing: "-0.04em" }}>
              Publish New Tender
            </h2>
            <p style={{ fontSize: 13, color: T.text3, fontWeight: 600, margin: 0, maxWidth: 380 }}>
              Open bidding to private contractors for civic infrastructure management.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: T.raised, border: `1px solid ${T.border}`, borderRadius: 16,
              color: T.text3, width: 44, height: 44, display: "flex",
              alignItems: "center", justifyContent: "center", boxShadow: SH.raisedSm,
              cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
            }}
          >
            <span style={{ width: 20, height: 20, display: "flex" }}><IconClose /></span>
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "32px 32px 8px" }}>

          {/* Success Banner */}
          {showSuccess && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#EAF3DE", border: "1px solid #27500A30", boxShadow: SH.insetSoft,
              borderRadius: 16, padding: "16px 20px", color: "#27500A",
              fontSize: 14, fontWeight: 800, marginBottom: 24,
            }}>
              <span style={{ width: 20, height: 20, display: "flex", flexShrink: 0 }}>
                <IconCheckmark size={20} />
              </span>
              Tender published successfully and opened for bids.
            </div>
          )}

          {/* ── General Information ── */}
          <SectionTitle>General Information</SectionTitle>

          <FormGroup>
            <FormLabel>Tender Title</FormLabel>
            <input
              style={inputStyle(titleError)}
              type="text"
              placeholder="e.g. Street Lighting Maintenance – Zone 4"
              value={form.tenderTitle}
              onChange={set("tenderTitle")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Tender Type</FormLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {TENDER_TYPES.map(({ id, value, label }) => (
                <RadioOption
                  key={id}
                  id={id}
                  value={value}
                  label={label}
                  checked={form.tenderType === value}
                  onChange={setType}
                />
              ))}
            </div>
          </FormGroup>

          <FormGroup>
            <FormLabel>Bid Deadline</FormLabel>
            <input
              style={{ ...inputStyle() } as any}
              type="date"
              value={form.bidDeadline}
              onChange={set("bidDeadline")}
            />
          </FormGroup>

          {/* ── Financials & Timeline ── */}
          <SectionTitle>Financials &amp; Timeline</SectionTitle>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            <FormGroup>
              <FormLabel>Estimated Budget ($)</FormLabel>
              <input
                style={inputStyle()}
                type="number"
                placeholder="0.00"
                value={form.budget}
                onChange={set("budget")}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>EMD Amount (Deposit $)</FormLabel>
              <input
                style={inputStyle()}
                type="number"
                placeholder="0.00"
                value={form.emd}
                onChange={set("emd")}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Contract Start Date</FormLabel>
              <input
                style={{ ...inputStyle() } as any}
                type="date"
                value={form.startDate}
                onChange={set("startDate")}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Contract End Date</FormLabel>
              <input
                style={{ ...inputStyle() } as any}
                type="date"
                value={form.endDate}
                onChange={set("endDate")}
              />
            </FormGroup>
          </div>

          {/* ── Details ── */}
          <SectionTitle>Details</SectionTitle>

          <FormGroup>
            <FormLabel>Description</FormLabel>
            <textarea
              style={{ ...inputStyle(), resize: "vertical", minHeight: 120, lineHeight: 1.6 } as any}
              rows={4}
              placeholder="Provide a brief overview of the tender purpose and requirements…"
              value={form.description}
              onChange={set("description")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Scope of Work</FormLabel>
            <textarea
              style={{ ...inputStyle(), resize: "vertical", minHeight: 160, lineHeight: 1.6 } as any}
              rows={5}
              placeholder="Detail the full scope of work, deliverables, and compliance standards expected from contractors…"
              value={form.scopeOfWork}
              onChange={set("scopeOfWork")}
            />
          </FormGroup>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: "100%", marginTop: 16,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40`,
              color: "#fff", border: "none", borderRadius: 16,
              padding: 20, fontSize: 14, fontWeight: 900,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: isSubmitting ? "wait" : "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10,
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <span style={{ width: 20, height: 20, display: "flex" }}><IconSend /></span>
            {isSubmitting ? "PUBLISHING..." : "Publish Tender"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small layout helpers ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 900, letterSpacing: "0.15em",
      textTransform: "uppercase", color: T.text3,
      marginBottom: 24, marginTop: 16, paddingBottom: 12,
      borderBottom: `2px dashed ${T.border}`,
    }}>
      {children}
    </div>
  );
}

function FormGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 24 }}>{children}</div>;
}
