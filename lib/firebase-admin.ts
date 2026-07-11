import { getApps, getApp, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

/**
 * Server-only Firebase Admin init, lazy for the same reason as
 * lib/firebase.ts: importing this module must never throw during build/
 * prerender, only when an API route actually calls it at request time.
 */
function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApp();
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel env vars store literal "\n" for newlines — restore real ones.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin is not configured (missing FIREBASE_* env vars).");
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export function getAdminAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getAdminApp());
  return authInstance;
}

export function getAdminDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getAdminApp());
  return dbInstance;
}
