"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Settings, Map as MapIcon,
  FileText, Briefcase, Award, Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------
type NavItem = {
  id: string;
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  isFab?: boolean;
};

const CITIZEN_NAV: NavItem[] = [
  { id: "home",     path: "/dashboard",  label: "Home",       Icon: Home },
  { id: "reports",  path: "/my-reports", label: "My Reports", Icon: FileText },
  { id: "report",   path: "/report",     label: "Report",     Icon: Plus,     isFab: true },
  { id: "map",      path: "/map",        label: "Map",        Icon: MapIcon },
  { id: "settings", path: "/settings",   label: "Settings",   Icon: Settings },
];

const GOVERNMENT_OFFICER_NAV: NavItem[] = [
  { id: "home",     path: "/government",             label: "Command",  Icon: Home },
  { id: "tenders",  path: "/department/tenders",     label: "Tenders",  Icon: FileText },
  { id: "evaluate", path: "/admin/tenders/evaluate", label: "Evaluate", Icon: Award },
  { id: "settings", path: "/settings",               label: "Settings", Icon: Settings },
];

const DEPARTMENT_NAV: NavItem[] = [
  { id: "home",      path: "/department",           label: "Queue",     Icon: Home },
  { id: "tenders",   path: "/department/tenders",   label: "Tenders",   Icon: FileText },
  { id: "employees", path: "/department/employees", label: "Employees", Icon: Users },
  { id: "settings",  path: "/settings",             label: "Settings",  Icon: Settings },
];

const COMPANY_ADMIN_NAV: NavItem[] = [
  { id: "home",     path: "/company-admin", label: "Operations", Icon: Home },
  { id: "tenders",  path: "/company-admin", label: "Tenders",    Icon: Briefcase },
  { id: "settings", path: "/settings",      label: "Settings",   Icon: Settings },
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
  { id: "home",     path: "/admin",             label: "Overview", Icon: Home },
  { id: "reports",  path: "/admin/reports",      label: "Reports",  Icon: FileText },
  { id: "tenders",  path: "/department/tenders", label: "Tenders",  Icon: Briefcase },
  { id: "settings", path: "/settings",           label: "Settings", Icon: Settings },
];

function getNav(role: string): NavItem[] {
  if      (role === "super_admin")        return ADMIN_NAV;
  else if (role === "government_officer") return GOVERNMENT_OFFICER_NAV;
  else if (role === "department_admin")   return DEPARTMENT_NAV;
  else if (role === "company_admin")      return COMPANY_ADMIN_NAV;
  else if (role === "company_employee")   return COMPANY_EMPLOYEE_NAV;
  else if (role === "employee")           return EMPLOYEE_NAV;
  return CITIZEN_NAV;
}

// ---------------------------------------------------------------------------
// BottomNav
// ---------------------------------------------------------------------------
export default function BottomNav({ role = "citizen" }: { role?: string }) {
  const pathname = usePathname();
  const NAV = getNav(role);

  // Sort longer paths first so /admin/reports matches before /admin
  const activeId =
    [...NAV]
      .sort((a, b) => b.path.length - a.path.length)
      .find(n => pathname === n.path || pathname?.startsWith(n.path + "/"))
      ?.id ?? NAV[0]?.id;

  return (
    <>
      <style>{`
        /* ── Pill bar wrapper ── */
        .bnav-wrap {
          position: fixed;
          bottom: max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px));
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          animation: bnav-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes bnav-rise {
          from { opacity: 0; transform: translateX(-50%) translateY(24px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ── Pill bar itself ── */
        .bnav-pill {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(28px) saturate(1.8);
          -webkit-backdrop-filter: blur(28px) saturate(1.8);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        /* ── Divider between nav sections ── */
        .bnav-divider {
          width: 1px;
          height: 24px;
          background: rgba(0,0,0,0.08);
          margin: 0 4px;
          flex-shrink: 0;
        }

        /* ── Individual nav button ── */
        .bnav-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 999px;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.18s ease, transform 0.12s ease;
          flex-shrink: 0;
        }
        .bnav-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .bnav-btn:active {
          transform: scale(0.88);
        }

        /* ── FAB (center report button) ── */
        .bnav-fab {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff6b35, #f7c948, #1D9E75);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
          box-shadow:
            0 4px 16px rgba(255, 107, 53, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          flex-shrink: 0;
        }
        .bnav-fab:hover {
          transform: scale(1.08);
          box-shadow:
            0 6px 22px rgba(255, 107, 53, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        .bnav-fab:active {
          transform: scale(0.93);
        }

        /* ── Active dot ── */
        .bnav-dot {
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b35, #f53b3b);
          box-shadow: 0 0 6px rgba(255, 107, 53, 0.7);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        /* ── Tooltip on hover (desktop) ── */
        .bnav-btn::before {
          content: attr(data-label);
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) scale(0.8);
          background: rgba(15, 23, 42, 0.88);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          letter-spacing: 0.01em;
        }
        @media (hover: hover) {
          .bnav-btn:hover::before {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }

        /* ── Mobile: a bit smaller pill on very small screens ── */
        @media (max-width: 380px) {
          .bnav-btn  { width: 42px; height: 42px; }
          .bnav-fab  { width: 40px; height: 40px; }
          .bnav-pill { padding: 5px 8px; gap: 0; }
        }
      `}</style>

      <div className="bnav-wrap">
        <nav className="bnav-pill">
          {NAV.map(({ id, path, label, Icon, isFab }, i) => {
            const isActive = activeId === id;

            if (isFab) {
              return (
                <React.Fragment key={id}>
                  {/* Divider before FAB */}
                  {i > 0 && <div className="bnav-divider" />}
                  <Link href={path} className="bnav-fab" aria-label={label}>
                    <Icon size={20} color="#fff" strokeWidth={2.5} />
                  </Link>
                  {/* Divider after FAB */}
                  {i < NAV.length - 1 && <div className="bnav-divider" />}
                </React.Fragment>
              );
            }

            return (
              <Link
                key={id}
                href={path}
                className="bnav-btn"
                aria-label={label}
                data-label={label}
              >
                <Icon
                  size={22}
                  color={isActive ? "#ff6b35" : "#64748b"}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {isActive && <span className="bnav-dot" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
