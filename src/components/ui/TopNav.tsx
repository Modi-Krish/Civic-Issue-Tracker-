'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/client-actions/auth';
import {
  Home, FileText, MapPin, Bell, Trophy, Settings, LogOut, Shield, Menu, X
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TopNavProps {
  userRole?: string;
  userName?: string;
}

export default function TopNav({ userRole = 'citizen', userName = 'User' }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const citizenLinks = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/reports', icon: FileText, label: 'Reports' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { href: '/settings', icon: Settings, label: 'Profile' },
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

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl transition-colors hover:bg-white/5 relative"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-surface)]"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-50"
                 style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <span className="font-bold text-white text-sm">Notifications</span>
                <Link href="/notifications" className="text-xs text-[var(--primary)] hover:underline" onClick={() => setNotificationsOpen(false)}>
                  View all
                </Link>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <Link
                    key={i}
                    href="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="block p-3 border-b last:border-0 hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="text-sm text-white font-medium mb-1">New Update Available</div>
                    <div className="text-xs text-text-muted">You have a new notification regarding your recent report.</div>
                    <div className="text-[10px] text-text-muted mt-2 opacity-70">2 hours ago</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link
          href="/settings"
          className="p-2 rounded-xl transition-colors hover:bg-white/5"
          title="Profile"
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
