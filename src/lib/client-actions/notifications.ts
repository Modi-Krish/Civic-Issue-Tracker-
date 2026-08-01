/**
 * Client-side notification actions for Capacitor build.
 * Note: sendNotification (FCM server-side push) cannot run on the client.
 * It should be triggered via a Supabase Edge Function or database trigger.
 * Only saveDeviceToken is converted here for client-side use.
 */
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, setDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';

/**
 * Save a device token for push notifications.
 */
export async function saveDeviceToken(token: string, platform: string = 'android') {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  try {
    const tokenRef = doc(db, 'device_tokens', token);
    await setDoc(tokenRef, {
      user_id: user.uid,
      token,
      platform,
      is_active: true,
      updated_at: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error("Error saving device token:", error);
    return { error: error.message };
  }
}

/**
 * Fetch notifications for the current user.
 */
export async function fetchNotifications() {
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated', notifications: [] };

  try {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { notifications };
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return { error: error.message, notifications: [] };
  }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { is_read: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error marking notification read:", error);
    return { error: error.message };
  }
}

/**
 * Dispatch a system notification to a target user.
 */
export async function sendSystemNotification({
  userId,
  title,
  body,
  type = 'status_updated',
  issueId = null,
  tenderId = null
}: {
  userId: string;
  title: string;
  body: string;
  type?: string;
  issueId?: string | null;
  tenderId?: string | null;
}) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      type,
      issue_id: issueId,
      tender_id: tenderId,
      is_read: false,
      created_at: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

