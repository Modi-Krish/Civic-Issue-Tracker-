"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Settings, Map as MapIcon,
  FileText, Briefcase, Award, Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const T = {
  raised:     "#F5F3EC",
  border:     "#DDD9CE",
  text3:      "#888780",
  accent:     "#1D9E75",
  accentDark: "#167A5B",
  shL: "rgba(255,255,255,0.75)",
  shD: "rgba(0,0,0,0.09)",
} as const;

const SH = {
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
};

// ---------------------------------------------------------------------------
// Nav definitions (identical paths/labels as before)
// ---------------------------------------------------------------------------
type NavItem = {
  id: string;
  path: string;
  label: string | null;
  Icon?: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  isFab?: boolean;
};

const CITIZEN_NAV: NavItem[] = [
  { id: "home",     path: "/dashboard",  label: "Home",       Icon: Home },
  { id: "reports",  path: "/my-reports", label: "My reports", Icon: FileText },
  { id: "report",   path: "/report",     label: null,         isFab: true },
  { id: "map",      path: "/map",        label: "Map",        Icon: MapIcon },
  { id: "settings", path: "/settings",  label: "Settings",   Icon: Settings },
];

const GOVERNMENT_OFFICER_NAV: NavItem[] = [
  { id: "home",     path: "/government",              label: "Command",  Icon: Home },
  { id: "tenders",  path: "/department/tenders",      label: "Tenders",  Icon: FileText },
  { id: "evaluate", path: "/admin/tenders/evaluate",  label: "Evaluate", Icon: Award },
  { id: "settings", path: "/settings",                label: "Settings", Icon: Settings },
];

const DEPARTMENT_NAV: NavItem[] = [
  { id: "home",      path: "/department",           label: "Queue",     Icon: Home },
  { id: "tenders",   path: "/department/tenders",   label: "Tenders",   Icon: FileText },
  { id: "employees", path: "/department/employees", label: "Employees", Icon: Users },
  { id: "settings",  path: "/settings",             label: "Settings",  Icon: Settings },
];

const COMPANY_ADMIN_NAV: NavItem[] = [
  { id: "home",     path: "/company-admin", label: "Operations",  Icon: Home },
  { id: "tenders",  path: "/company-admin", label: "Bid Tenders", Icon: Briefcase },
  { id: "settings", path: "/settings",      label: "Settings",    Icon: Settings },
];

const COMPANY_EMPLOYEE_NAV: NavItem[] = [
  { id: "home",     path: "/company-employee", label: "Field Tasks", Icon: Home },
  { id: "settings", path: "/settings",         label: "Settings",    Icon: Settings },
];

const EMPLOYEE_NAV: NavItem[] = [
  { id: "home",     path: "/tasks",    label: "Tasks",    Icon: Home },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { id: "home",     path: "/admin",               label: "Overview", Icon: Home },
  { id: "reports",  path: "/admin/reports",        label: "Reports",  Icon: FileText },
  { id: "tenders",  path: "/department/tenders",   label: "Tenders",  Icon: Briefcase },
  { id: "settings", path: "/settings",             label: "Settings", Icon: Settings },
];

// ---------------------------------------------------------------------------
// BottomNav component
// ---------------------------------------------------------------------------
export default function BottomNav({ role = "citizen" }: { role?: string }) {
  const pathname = usePathname();

  let NAV = CITIZEN_NAV;
  if      (role === "super_admin")        NAV = ADMIN_NAV;
  else if (role === "government_officer") NAV = GOVERNMENT_OFFICER_NAV;
  else if (role === "department_admin")   NAV = DEPARTMENT_NAV;
  else if (role === "company_admin")      NAV = COMPANY_ADMIN_NAV;
  else if (role === "company_employee")   NAV = COMPANY_EMPLOYEE_NAV;
  else if (role === "employee")           NAV = EMPLOYEE_NAV;

  const activeId =
    NAV.find(n => pathname === n.path || pathname?.startsWith(n.path + "/"))?.id ?? "home";

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999,
      background: T.raised,
      borderTop: `1px solid ${T.border}`,
      boxShadow: `0 -4px 16px ${T.shD}, 0 -1px 0 rgba(255,255,255,0.8)`,
      height: "calc(72px + env(safe-area-inset-bottom, 0px))",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      display: "flex", alignItems: "center",
      paddingLeft: 4, paddingRight: 4,
    }}>
      {NAV.map(({ id, path, label, Icon, isFab }) => {
        const isActive = activeId === id;

        if (isFab) {
          return (
            <div key={id} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Link
                href={path}
                style={{
                  width: 52, height: 52, borderRadius: 17,
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `6px 6px 14px ${T.shD}, -5px -5px 12px ${T.shL}`,
                  WebkitTapHighlightColor: "transparent",
                  textDecoration: "none",
                }}
              >
                <Plus size={22} color="#fff" strokeWidth={2.2} />
              </Link>
            </div>
          );
        }

        return (
          <Link
            key={id}
            href={path}
            style={{
              flex: 1, height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 5, textDecoration: "none",
              position: "relative",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {Icon && (
              <Icon
                size={22}
                color={isActive ? T.accent : T.text3}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
            )}
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1, letterSpacing: "0.01em",
              color: isActive ? T.accent : T.text3,
            }}>
              {label}
            </span>

            {/* Active indicator pill */}
            <span style={{
              position: "absolute", bottom: 6, left: "50%",
              transform: "translateX(-50%)",
              width: isActive ? 20 : 0, height: 3,
              borderRadius: 99, background: T.accent,
              transition: "width 0.22s ease",
              boxShadow: isActive ? `0 0 8px ${T.accent}55` : "none",
            }} />
          </Link>
        );
      })}
    </nav>
  );
}
