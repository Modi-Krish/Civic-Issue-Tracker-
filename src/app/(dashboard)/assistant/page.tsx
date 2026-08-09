'use client';

import React, { useState } from 'react';
import GrievanceChatbot from '@/components/ui/GrievanceChatbot';
import { useAuth } from '@/lib/supabase/auth-context';

export default function AssistantPage() {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex-1 h-full w-full relative">
      <GrievanceChatbot 
        isOpen={true} 
        onClose={() => {
          // Just go back to dashboard if closed
          window.location.href = '/dashboard';
        }} 
        user={user} 
      />
    </div>
  );
}
