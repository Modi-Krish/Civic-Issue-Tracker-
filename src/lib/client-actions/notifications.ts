/**
 * Client-side notification actions for Capacitor build.
 * Note: sendNotification (FCM server-side push) cannot run on the client.
 * It should be triggered via a Supabase Edge Function or database trigger.
 * Only saveDeviceToken is converted here for client-side use.
 */
import { createClient } from '@/lib/supabase/client';

/**
 * Save a device token for push notifications.
 * Called from client-side Capacitor Push Notification plugin.
 */
export async function saveDeviceToken(token: string, platform: string = 'android') {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Use upsert to update if exists, or insert new
  const { error } = await supabase
    .from('device_tokens')
    .upsert({
      user_id: user.id,
      token,
      platform,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'token' });

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Fetch notifications for the current user.
 */
export async function fetchNotifications() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', notifications: [] };

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { error: error.message, notifications: [] };
  return { notifications: data || [] };
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) return { error: error.message };
  return { success: true };
}
