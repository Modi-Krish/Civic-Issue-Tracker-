/**
 * Client-side auth actions for Capacitor build.
 * Uses Firebase Auth and Firestore.
 */
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

function getRedirectRoute(role: string): string {
  switch (role) {
    case 'citizen': return '/dashboard';
    case 'government_officer': return '/government';
    case 'department_admin': return '/department';
    case 'company_admin': return '/company-admin';
    case 'company_employee': return '/company-employee';
    case 'super_admin': return '/admin';
    default: return '/dashboard';
  }
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = (formData.get('full_name') as string)?.trim();

  const role = 'citizen';

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    await firebaseUpdateProfile(user, { displayName: fullName });

    await setDoc(doc(db, 'profiles', user.uid), {
      id: user.uid,
      full_name: fullName,
      role,
      department_id: null,
      email: user.email,
      created_at: new Date().toISOString()
    });

    return { success: true, redirectTo: getRedirectRoute(role) };
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      return { 
        error: `Firebase Auth Error: Domain not authorized (${typeof window !== 'undefined' ? window.location.hostname : 'Vercel'}). Please add this domain to Authorized Domains in Firebase Console -> Authentication -> Settings.`
      };
    }
    if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      return { 
        error: 'Firebase Auth Error: Invalid API Key. Please verify NEXT_PUBLIC_FIREBASE_API_KEY in Vercel project environment variables.'
      };
    }
    return { error: error?.message || 'Authentication failed.' };
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
    const role = profileSnap.exists() ? profileSnap.data().role : 'citizen';

    return { success: true, redirectTo: getRedirectRoute(role) };
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      return { 
        error: `Firebase Auth Error: Domain not authorized (${typeof window !== 'undefined' ? window.location.hostname : 'Vercel'}). Add this domain in Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      };
    }
    if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      return { 
        error: 'Firebase Auth Error: Invalid API Key. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in Vercel environment variables.'
      };
    }
    return { error: error.message };
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { success: true, redirectTo: '/login' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateProfile(formData: FormData) {
  const fullName = (formData.get('full_name') as string)?.trim();
  if (!fullName) return { error: 'Name is required' };

  const user = auth.currentUser;
  if (!user) return { error: 'Unauthorized' };

  try {
    await firebaseUpdateProfile(user, { displayName: fullName });
    await updateDoc(doc(db, 'profiles', user.uid), { full_name: fullName });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function quickLogin(role: string) {
  const emailMap: Record<string, string> = {
    'citizen': 'citizencivictracker@gmail.com',
    'government_officer': 'govofficercivictracker@gmail.com',
    'department_admin': 'roadcivictracker@gmail.com',
    'company_admin': 'companyadmincivictracker@gmail.com',
    'company_employee': 'companyemployeecivictracker@gmail.com',
    'super_admin': 'superadmincivictracker@gmail.com'
  };

  const email = emailMap[role] || `${role}@test.com`;
  const password = process.env.NEXT_PUBLIC_TEST_PASSWORD || 'Password123!';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true, redirectTo: getRedirectRoute(role) };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        const fullName = `Test ${role.replace('_', ' ')}`;
        
        await firebaseUpdateProfile(user, { displayName: fullName });
        await setDoc(doc(db, 'profiles', user.uid), {
          id: user.uid,
          full_name: fullName,
          role: role,
          department_id: null,
          email: user.email,
          created_at: new Date().toISOString()
        });

        return { success: true, redirectTo: getRedirectRoute(role) };
      } catch (signUpError: any) {
        return { error: signUpError.message };
      }
    }
    if (error.code === 'auth/unauthorized-domain') {
      return { 
        error: `Firebase Auth Error: Domain not authorized (${typeof window !== 'undefined' ? window.location.hostname : 'Vercel'}). Add this domain in Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      };
    }
    if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      return { 
        error: 'Firebase Auth Error: Invalid API Key. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in Vercel environment variables.'
      };
    }
    return { error: error.message };
  }
}

export async function loginWithEmail(email: string) {
  const password = process.env.NEXT_PUBLIC_TEST_PASSWORD || 'Password123!';

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
    const role = profileSnap.exists() ? profileSnap.data().role : 'citizen';

    return { success: true, redirectTo: getRedirectRoute(role) };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // Create user if not exist (legacy logic)
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        await setDoc(doc(db, 'profiles', user.uid), {
          id: user.uid,
          full_name: 'Test Citizen',
          role: 'citizen',
          department_id: null,
          email: user.email,
          created_at: new Date().toISOString()
        });
        return { success: true, redirectTo: getRedirectRoute('citizen') };
      } catch (createError: any) {
        if (createError.code === 'auth/unauthorized-domain') {
          return { 
            error: `Firebase Auth Error: Domain not authorized (${typeof window !== 'undefined' ? window.location.hostname : 'Vercel'}). Add domain in Firebase Console -> Authentication -> Settings -> Authorized Domains.`
          };
        }
        return { error: createError?.message || 'Failed to synchronize with Firebase Auth.' };
      }
    }
    if (error.code === 'auth/unauthorized-domain') {
      return { 
        error: `Firebase Auth Error: Domain not authorized (${typeof window !== 'undefined' ? window.location.hostname : 'Vercel'}). Add domain in Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      };
    }
    if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      return { 
        error: 'Firebase Auth Error: Invalid API Key. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in Vercel environment variables.'
      };
    }
    return { error: error?.message || `Firebase authentication failed (${error.code || 'unknown'}).` };
  }
}
