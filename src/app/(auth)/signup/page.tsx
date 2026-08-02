'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The signup form is now embedded in the combined auth page at /login.
 * This page redirects seamlessly so existing links/bookmarks still work.
 */
export default function SignUpRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  // Minimal neomorphism-lite holding screen while redirecting
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#EDEBE4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid rgba(0,0,0,0.06)',
          borderTopColor: '#1D9E75',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `,
      }} />
    </div>
  );
}
