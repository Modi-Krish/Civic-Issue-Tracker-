"use client";

import { ShieldAlert, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/client-actions/auth";

// Design tokens (subset needed here)
const T = {
  base:   "#EDEBE4",
  raised: "#F5F3EC",
  text1:  "#2C2C2A",
  text2:  "#5F5E5A",
  shL: "rgba(255,255,255,0.75)",
  shD: "rgba(0,0,0,0.09)",
} as const;

const SH = {
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
};

export default function PendingApprovalUI({ role }: { role: string }) {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100dvh",
      background: T.base,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.text1, padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: "100%", textAlign: "center",
        background: T.raised,
        borderRadius: 28, padding: "48px 32px",
        boxShadow: SH.raised,
      }}>
        {/* Warning icon chip — electricity/amber tint */}
        <div style={{
          width: 68, height: 68, borderRadius: 20,
          background: "#FAEEDA",
          color: "#854F0B",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
          boxShadow: SH.raised,
        }}>
          <ShieldAlert size={30} strokeWidth={1.8} />
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 900, marginBottom: 12,
          letterSpacing: "-0.03em", color: T.text1,
        }}>
          Account Pending Approval
        </h1>
        <p style={{
          color: T.text2, fontSize: 14, lineHeight: 1.65, marginBottom: 36,
        }}>
          Your request for the{" "}
          <strong style={{ color: T.text1 }}>
            {role.replace(/_/g, " ").toUpperCase()}
          </strong>{" "}
          role is currently under review by an administrator. You will gain access once approved.
        </p>

        <button
          onClick={async () => {
            const result = await signOut();
            if (result?.redirectTo) router.push(result.redirectTo);
          }}
          style={{
            padding: "14px 32px", borderRadius: 16,
            background: "#FCEBEB",  // fire tint
            color: "#791F1F",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            cursor: "pointer", border: "none",
            display: "inline-flex", alignItems: "center", gap: 10,
            boxShadow: SH.raisedSm,
          }}
        >
          <LogOut size={17} strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
