'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/client-actions/auth';
import {
  Home, FileText, MapPin, Bell, Trophy, Settings, LogOut, Shield, Menu, X
} from 'lucide-react';
import { useState } from 'react';

interface TopNavProps {
  userRole?: string;
  userName?: string;
}

export default function TopNav({ userRole = 'citizen', userName = 'User' }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const citizenLinks = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/my-reports', icon: FileText, label: 'My Reports' },
    { href: '/report', icon: MapPin, label: 'Report Issue' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { href: '/rewards', icon: Trophy, label: 'Rewards' },
  ];

  const adminLinks = [
    { href: '/department', icon: Home, label: 'Department Queue' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const employeeLinks = [
    { href: '/tasks', icon: Home, label: 'My Tasks' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const links = userRole === 'department_admin' ? adminLinks
    : userRole === 'employee' ? employeeLinks
    : citizenLinks;

  return (
    <header
      className="hidden sm:flex items-center justify-between px-6 py-3 border-b sticky top-0 z-50"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-primary">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-lg">CivicTracker</span>
      </Link>

      {/* Nav Links */}
      <nav className="flex items-center gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User / Settings */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{userName}</p>
          <p className="text-xs text-text-muted capitalize">{userRole.replace('_', ' ')}</p>
        </div>
        <Link
          href="/settings"
          className="p-2 rounded-xl transition-colors hover:bg-white/5"
        >
          <Settings className="w-5 h-5 text-text-secondary" />
        </Link>
        <button
          onClick={async () => {
            const result = await signOut();
            if (result?.redirectTo) router.push(result.redirectTo);
          }}
          className="p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
    </header>
  );
}
