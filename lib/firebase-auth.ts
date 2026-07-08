import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

/**
 * Firestore doesn't auto-create documents on sign-up — Firebase Auth only
 * creates the auth record. This mirrors it into a `users/{uid}` doc the
 * first time we see that uid, so every account gets a profile row without a
 * separate onboarding step.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    plan: "free",
    createdAt: serverTimestamp(),
  });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  if (displayName) await updateProfile(user, { displayName });
  await ensureUserProfile(user);
  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await ensureUserProfile(user);
  return user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureUserProfile(user);
  return user;
}

/**
 * Requires an Apple Developer Program membership (paid) to configure the
 * Services ID / key in the Firebase console — the code path works as soon
 * as that's set up, not before.
 */
export async function signInWithApple(): Promise<User> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const { user } = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureUserProfile(user);
  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Human-readable message for the common Firebase Auth error codes. */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    default:
      return "Something went wrong. Please try again.";
  }
}
