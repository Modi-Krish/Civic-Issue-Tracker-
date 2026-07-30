'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route-level error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Something went wrong!</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, maxWidth: 400 }}>
        {error.message || 'We encountered an unexpected issue while loading this page.'}
      </p>
      <button
        onClick={() => reset()}
        style={{ padding: '12px 24px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
      >
        Try again
      </button>
    </div>
  );
}
