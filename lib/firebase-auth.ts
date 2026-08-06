import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  getFirebaseAuth,
  getFirebaseDb,
} from "@/lib/firebase";

/**
 * Firebase Authentication crée le compte utilisateur,
 * mais ne crée pas automatiquement son profil Firestore.
 *
 * Cette fonction crée donc le document :
 * users/{uid}
 *
 * uniquement s'il n'existe pas encore.
 */
export async function ensureUserProfile(
  user: User
): Promise<void> {
  const userRef = doc(
    getFirebaseDb(),
    "users",
    user.uid
  );

  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return;
  }

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,

    // Le plan réellement actif.
    // Seuls /api/checkout/create et le webhook Whop pourront le modifier
    // ensuite (voir firestore.rules — le client ne peut plus le toucher
    // une fois ce document créé).
    plan: "free",

    // Le plan choisi pendant l’onboarding.
    selectedPlan: null,

    // L’utilisateur doit choisir son plan avant d’accéder à /app.
    onboardingCompleted: false,

    createdAt: serverTimestamp(),
  });
}

/**
 * Best-effort wrapper: never let a Firestore hiccup here turn a successful
 * Firebase Auth sign-in/sign-up into a hard failure. If this fails, the
 * account still exists and the next call to ensureUserProfile (next sign-in,
 * or the free-plan write via the Admin SDK from /api/checkout/create) will
 * retry it — self-healing instead of stranding the user with a working Auth
 * account but no Firestore profile and a confusing error message.
 */
async function ensureUserProfileBestEffort(user: User): Promise<void> {
  try {
    await ensureUserProfileBestEffort(user);
  } catch (err) {
    console.error("[auth] ensureUserProfile failed (non-fatal, will retry on next sign-in)", err);
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const { user } =
    await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password
    );

  if (displayName.trim()) {
    await updateProfile(user, {
      displayName: displayName.trim(),
    });
  }

  await ensureUserProfileBestEffort(user);

  // Google/Apple sign-in are pre-verified by their provider; email/password
  // is the only path that needs this — required before any referral reward
  // tied to this account can be granted (see lib/referral.ts).
  try {
    await sendEmailVerification(user);
  } catch (err) {
    console.error("[auth] sendEmailVerification failed", err);
    // Non-fatal — the account still works, just without the referral bonus
    // until the user re-triggers verification (e.g. from Settings).
  }

  return user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const { user } =
    await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password
    );

  await ensureUserProfileBestEffort(user);

  return user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();

  const { user } = await signInWithPopup(
    getFirebaseAuth(),
    provider
  );

  await ensureUserProfileBestEffort(user);

  return user;
}

/**
 * La connexion Apple nécessite une configuration
 * dans Apple Developer et dans Firebase.
 */
export async function signInWithApple(): Promise<User> {
  const provider = new OAuthProvider("apple.com");

  provider.addScope("email");
  provider.addScope("name");

  const { user } = await signInWithPopup(
    getFirebaseAuth(),
    provider
  );

  await ensureUserProfileBestEffort(user);

  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Re-sends the verification email (e.g. from the referral page, if the first one was missed). */
export async function resendEmailVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}

/**
 * Sends a password-reset email. Firebase itself doesn't reveal whether the
 * address is registered (the request resolves the same way either way), so
 * the caller should always show a neutral "check your inbox" message.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export class AuthTimeoutError extends Error {
  constructor() {
    super("Firebase auth request timed out");
    this.name = "AuthTimeoutError";
  }
}

/**
 * Empêche une connexion Firebase de rester bloquée
 * indéfiniment si la popup ou reCAPTCHA ne répond pas.
 */
export function withAuthTimeout<T>(
  promise: Promise<T>,
  ms = 15_000
): Promise<T> {
  return Promise.race([
    promise,

    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new AuthTimeoutError());
      }, ms);
    }),
  ]);
}

/**
 * Transforme les erreurs Firebase en messages compréhensibles.
 */
export function friendlyAuthError(
  error: unknown
): string {
  if (error instanceof AuthTimeoutError) {
    return "La connexion prend trop de temps. Vérifie ta connexion internet et réessaie.";
  }

  const code =
    (error as { code?: string })?.code ?? "";

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
      return "Ce domaine n'est pas autorisé dans Firebase Authentication.";

    case "auth/operation-not-allowed":
      return "Ce mode de connexion n'est pas activé dans Firebase.";

    case "auth/network-request-failed":
      return "Problème réseau. Vérifie ta connexion et réessaie.";

    case "permission-denied":
      return "Firebase refuse l'accès à la base de données. Vérifie les règles Firestore.";

    default:
      return code
        ? `Erreur (${code}). Réessaie.`
        : "Une erreur est survenue. Réessaie.";
  }
}