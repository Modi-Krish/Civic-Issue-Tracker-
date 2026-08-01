import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useRealtimeIssues() {
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    async function setupRealtime() {
      const { collection, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      unsubscribe = onSnapshot(collection(db, 'issues'), (snapshot) => {
        // We only care about changes after the initial load,
        // but even for initial load, if it's rendered on client,
        // it might be useful to refresh if it changed. 
        // For simplicity, we just call router.refresh().
        // Realistically, to avoid infinite loops, we should check for changes.
        const hasChanges = snapshot.docChanges().length > 0;
        if (hasChanges) {
          console.log('Realtime update received for issues.');
          router.refresh();
        }
      });
    }

    setupRealtime();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);
}
