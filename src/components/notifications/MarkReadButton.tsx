'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';

export default function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();

  async function markRead() {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    router.refresh();
  }

  return (
    <button
      onClick={markRead}
      className="p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 cursor-pointer"
      title="Mark as read"
    >
      <CheckCheck className="w-4 h-4" style={{ color: 'var(--primary)' }} />
    </button>
  );
}
