import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
// Credentials should be stored safely in Vercel Environment Variables
export function initFirebaseAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('Firebase Admin SDK initialization skipped: Missing environment variables.');
    }
  }
}

export const getMessaging = () => {
  initFirebaseAdmin();
  // Return messaging instance if initialized, else null
  return getApps().length > 0 ? getAdminMessaging() : null;
};
