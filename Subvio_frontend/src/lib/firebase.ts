import { initializeApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';

let app: FirebaseApp | null = null;

function firebaseAuth() {
  app ??= initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return getAuth(app);
}

/** Opens the Google popup and returns a Firebase ID token for the backend to verify. */
export async function googleIdToken() {
  const auth = firebaseAuth();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  const token = await result.user.getIdToken();
  await signOut(auth); // Session is managed by our own JWT from here on.
  return token;
}
