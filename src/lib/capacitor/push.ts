/**
 * Push Notification setup for Capacitor Android.
 * Uses @capacitor/push-notifications to register for FCM tokens
 * and handle incoming notifications.
 */
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { isNativePlatform } from './platform';
import { saveDeviceToken } from '@/lib/client-actions/notifications';

let isRegistered = false;

/**
 * Initialize push notifications — call this after the user logs in.
 * Requests permission, registers for FCM token, and saves it to Supabase.
 */
export async function initPushNotifications(
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationTapped?: (notification: ActionPerformed) => void
): Promise<string | null> {
  if (!isNativePlatform() || isRegistered) return null;

  try {
    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Register with FCM
    await PushNotifications.register();

    return new Promise((resolve) => {
      // On registration success — we get the FCM token
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, FCM token:', token.value);

        // Save token to Supabase
        const result = await saveDeviceToken(token.value, 'android');
        if (result.error) {
          console.error('Failed to save device token:', result.error);
        }

        isRegistered = true;
        resolve(token.value);
      });

      // On registration error
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
        resolve(null);
      });

      // Handle foreground notifications
      if (onNotificationReceived) {
        PushNotifications.addListener('pushNotificationReceived', onNotificationReceived);
      }

      // Handle notification tap (when user taps a notification to open the app)
      if (onNotificationTapped) {
        PushNotifications.addListener('pushNotificationActionPerformed', onNotificationTapped);
      }
    });
  } catch (error) {
    console.error('Push notification init error:', error);
    return null;
  }
}

/**
 * Remove all push notification listeners (call on logout).
 */
export async function cleanupPushNotifications(): Promise<void> {
  if (!isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
  isRegistered = false;
}
