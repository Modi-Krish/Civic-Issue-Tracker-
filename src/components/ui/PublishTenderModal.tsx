import React, { useState, useRef, useEffect } from "react";
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22 11 13 2 9l20-7z" />
  </svg>
);

const IconCheckmark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        background: checked ? "rgba(79,124,248,0.08)" : "#181818",
        border: `1px solid ${checked ? "#4f7cf8" : "#282828"}`,
        borderRadius: 10, padding: "12px 16px", cursor: "pointer",
        fontSize: 13, color: checked ? "#c5d3ff" : "#888", fontWeight: 500,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <input
        type="radio" id={id} value={value} checked={checked}
        onChange={() => onChange(value)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        border: `1.5px solid ${checked ? "#4f7cf8" : "#333"}`,
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.15s",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: "#4f7cf8",
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
      display: "block", fontSize: 12, fontWeight: 600,
      color: "#aaa", marginBottom: 8, letterSpacing: "0.04em",
    }}>
      {children}
    </label>
  );
}

const inputStyle = (hasError = false) => ({
  width: "100%", background: "#181818",
  border: `1px solid ${hasError ? "#f87171" : "#282828"}`,
  borderRadius: 10, color: "#fff", fontSize: 14,
  fontFamily: "inherit", padding: "12px 16px",
  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  WebkitAppearance: "none" as any, appearance: "none" as any,
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
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
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
          background: "#111", borderRadius: "20px 20px 0 0",
          borderTop: "1px solid #222", width: "100%", maxWidth: 720,
          maxHeight: "92vh", overflowY: "auto", paddingBottom: 120,
          transform: isOpen ? "translateY(0)" : "translateY(40px)",
          transition: "transform 0.28s cubic-bezier(0.25,0.8,0.25,1)",
        }}
      >
        {/* Sheet Header */}
        <div style={{
          position: "sticky", top: 0, background: "#111",
          borderBottom: "1px solid #1e1e1e", padding: "20px 28px 18px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", zIndex: 5,
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              Publish New Tender
            </h2>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5, maxWidth: 380 }}>
              Open bidding to private contractors for civic infrastructure management.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 8,
              color: "#888", width: 34, height: 34, display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
            }}
          >
            <span style={{ width: 16, height: 16, display: "flex" }}><IconClose /></span>
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "28px 28px 8px" }}>

          {/* Success Banner */}
          {showSuccess && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
              borderRadius: 10, padding: "14px 18px", color: "#34d399",
              fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>
              <span style={{ width: 16, height: 16, display: "flex", flexShrink: 0 }}>
                <IconCheckmark size={16} />
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
              style={{ ...inputStyle(), colorScheme: "dark" } as any}
              type="date"
              value={form.bidDeadline}
              onChange={set("bidDeadline")}
            />
          </FormGroup>

          {/* ── Financials & Timeline ── */}
          <SectionTitle>Financials &amp; Timeline</SectionTitle>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                style={{ ...inputStyle(), colorScheme: "dark" } as any}
                type="date"
                value={form.startDate}
                onChange={set("startDate")}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Contract End Date</FormLabel>
              <input
                style={{ ...inputStyle(), colorScheme: "dark" } as any}
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
              style={{ ...inputStyle(), resize: "vertical", minHeight: 100, lineHeight: 1.6 } as any}
              rows={4}
              placeholder="Provide a brief overview of the tender purpose and requirements…"
              value={form.description}
              onChange={set("description")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Scope of Work</FormLabel>
            <textarea
              style={{ ...inputStyle(), resize: "vertical", minHeight: 120, lineHeight: 1.6 } as any}
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
              width: "100%", marginTop: 8,
              background: "linear-gradient(135deg, #4f7cf8 0%, #7c5af4 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: 16, fontSize: 14, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: isSubmitting ? "wait" : "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <span style={{ width: 16, height: 16, display: "flex" }}><IconSend /></span>
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
      fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase", color: "#555",
      marginBottom: 18, marginTop: 8, paddingBottom: 10,
      borderBottom: "1px solid #1e1e1e",
    }}>
      {children}
    </div>
  );
}

function FormGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 20 }}>{children}</div>;
}
