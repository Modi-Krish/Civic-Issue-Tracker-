"use client";

import { useAuth } from "@/lib/supabase/auth-context";
import BottomNav from "@/components/ui/BottomNav";
import PendingApprovalUI from "@/components/ui/PendingApprovalUI";
import { useEffect } from "react";
import { initPushNotifications } from "@/lib/capacitor/push";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (profile && profile.account_status !== "PENDING") {
      // Temporarily disabled: requires google-services.json in android/app
      // Otherwise, the Capacitor Push Notifications plugin crashes the app.
      // initPushNotifications().catch(console.error);
    }
  }, [profile]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "#EDEBE4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          border: "3px solid #DDD9CE",
          borderTopColor: "#1D9E75",
          animation: "spin 0.8s linear infinite",
        }} />
        <style dangerouslySetInnerHTML={{ __html:
          "@keyframes spin { to { transform: rotate(360deg); } }"
        }} />
      </div>
    );
  }

  // Intercept unapproved accounts
  if (profile?.account_status === "PENDING") {
    return <PendingApprovalUI role={profile.role} />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1" style={{ paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}>{children}</main>
      <BottomNav role={profile?.role} />
    </div>
  );
}
