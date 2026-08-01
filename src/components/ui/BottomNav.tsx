'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Settings, Map as MapIcon, FileText, Briefcase, Award, ShieldCheck, Building } from 'lucide-react';

type NavItem = {
  id: string;
  path: string;
  label: string | null;
  Icon?: any;
  isFab?: boolean;
};

const CITIZEN_NAV: NavItem[] = [
  { id: "home", path: "/dashboard", label: "Home", Icon: Home },
  { id: "reports", path: "/my-reports", label: "My reports", Icon: FileText },
  { id: "report", path: "/report", label: null, isFab: true },
  { id: "map", path: "/map", label: "Map", Icon: MapIcon },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const GOVERNMENT_OFFICER_NAV: NavItem[] = [
  { id: "home", path: "/government", label: "Command", Icon: Home },
  { id: "tenders", path: "/department/tenders", label: "Tenders", Icon: FileText },
  { id: "evaluate", path: "/admin/tenders/evaluate", label: "Evaluate", Icon: Award },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const DEPARTMENT_NAV: NavItem[] = [
  { id: "home", path: "/department", label: "Queue", Icon: Home },
  { id: "tenders", path: "/department/tenders", label: "Tenders", Icon: FileText },
  { id: "employees", path: "/department/employees", label: "Employees", Icon: Users },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const COMPANY_ADMIN_NAV: NavItem[] = [
  { id: "home", path: "/company-admin", label: "Operations", Icon: Home },
  { id: "tenders", path: "/company-admin", label: "Bid Tenders", Icon: Briefcase },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const COMPANY_EMPLOYEE_NAV: NavItem[] = [
  { id: "home", path: "/company-employee", label: "Field Tasks", Icon: Home },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const EMPLOYEE_NAV: NavItem[] = [
  { id: "home", path: "/tasks", label: "Tasks", Icon: Home },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { id: "home", path: "/admin", label: "Overview", Icon: Home },
  { id: "reports", path: "/admin/reports", label: "Reports", Icon: FileText },
  { id: "tenders", path: "/department/tenders", label: "Tenders", Icon: Briefcase },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
];

export default function BottomNav({ role = 'citizen' }: { role?: string }) {
  const pathname = usePathname();

  let NAV = CITIZEN_NAV;
  if (role === 'super_admin') NAV = ADMIN_NAV;
  else if (role === 'government_officer') NAV = GOVERNMENT_OFFICER_NAV;
  else if (role === 'department_admin') NAV = DEPARTMENT_NAV;
  else if (role === 'company_admin') NAV = COMPANY_ADMIN_NAV;
  else if (role === 'company_employee') NAV = COMPANY_EMPLOYEE_NAV;
  else if (role === 'employee') NAV = EMPLOYEE_NAV;

  const activeId = NAV.find(n => pathname === n.path || pathname?.startsWith(n.path + '/'))?.id || 'home';

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999,
      background: "rgba(13, 13, 15, 0.96)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderTop: "0.5px solid rgba(255, 255, 255, 0.08)",
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
              <Link href={path} style={{
                width: 48, height: 48, borderRadius: 15, border: "none",
                background: "linear-gradient(135deg, #FF2E11, #A79277)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(255, 46, 17, 0.55), 0 0 0 1px rgba(167, 146, 119, 0.3)",
                WebkitTapHighlightColor: "transparent",
                textDecoration: "none",
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          );
        }

        return (
          <Link
            key={id}
            href={path}
            style={{
              flex: 1, height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 5,
              textDecoration: "none", position: "relative",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {Icon && (
              <Icon 
                size={22} 
                color={isActive ? "#FF2E11" : "rgba(255, 255, 255, 0.32)"} 
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            )}
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500, lineHeight: 1,
              letterSpacing: "0.01em", color: isActive ? "#FF2E11" : "rgba(255, 255, 255, 0.32)",
            }}>
              {label}
            </span>
            {/* Pill indicator */}
            <span style={{
              position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
              width: isActive ? 18 : 0, height: 3, borderRadius: 99,
              background: "#FF2E11", transition: "width 0.2s ease"
            }} />
          </Link>
        );
      })}
    </nav>
  );
}
