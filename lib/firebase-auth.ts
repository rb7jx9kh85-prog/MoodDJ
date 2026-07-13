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

  // Le vrai plan actif de l’utilisateur.
  // Il reste "free" tant qu’un paiement Stripe n’a pas été confirmé.
  plan: "free",

  // Plan sélectionné pendant l’onboarding.
  selectedPlan: null,

  // Empêche l’accès à /app avant le choix d’un plan.
  onboardingCompleted: false,

  createdAt: serverTimestamp(),
});

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

export class AuthTimeoutError extends Error {
  constructor() {
    super("Firebase auth request timed out");
    this.name = "AuthTimeoutError";
  }
}

/**
 * Firebase's popup/reCAPTCHA flows can hang indefinitely (blocked popup,
 * unauthorized domain, ad-blocker eating the reCAPTCHA script) instead of
 * rejecting — wrap every auth call so the UI always recovers.
 */
export function withAuthTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new AuthTimeoutError()), ms)),
  ]);
}

/** Human-readable message for the common Firebase Auth error codes. */
export function friendlyAuthError(err: unknown): string {
  if (err instanceof AuthTimeoutError) {
    return "La connexion prend trop de temps. Vérifie ta connexion internet et réessaie.";
  }
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet email.";
    case "auth/invalid-email":
      return "Cette adresse email est invalide.";
    case "auth/weak-password":
      return "Choisis un mot de passe d'au moins 6 caractères.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email ou mot de passe incorrect.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Connexion annulée.";
    case "auth/popup-blocked":
      return "Ton navigateur a bloqué la fenêtre de connexion. Autorise les popups pour ce site.";
    case "auth/unauthorized-domain":
      return "Ce domaine n'est pas autorisé côté Firebase (Authentication → Settings → Authorized domains).";
    case "auth/operation-not-allowed":
      return "Ce mode de connexion n'est pas activé côté Firebase (Authentication → Sign-in method).";
    case "auth/network-request-failed":
      return "Problème réseau. Vérifie ta connexion et réessaie.";
    default:
      return code ? `Erreur (${code}). Réessaie.` : "Une erreur est survenue. Réessaie.";
  }
}
