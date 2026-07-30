'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real app, this is where we'd send the error to Sentry or another error tracking service
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <html>
      <body style={{ backgroundColor: '#0d0d0f', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h2>Something went terribly wrong!</h2>
        <p style={{ color: '#ef4444' }}>{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => reset()}
          style={{ marginTop: 20, padding: '10px 20px', backgroundColor: '#FF2E11', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
