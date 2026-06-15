import * as admin from 'firebase-admin';

let initialized = false;

/**
 * Lazily initializes the Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_JSON.
 * Returns false (and logs a warning) when the credential isn't configured, so the
 * server can still boot — only Firebase-dependent routes (phone OTP) are affected.
 * This must NOT throw at import time, or it takes the whole app down on startup.
 */
function ensureFirebase(): boolean {
  if (initialized) return true;
  if (admin.apps.length) { initialized = true; return true; }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT_JSON not set — phone OTP verification is disabled.');
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });
  initialized = true;
  return true;
}

/**
 * Verifies a Firebase ID token and returns the decoded token.
 * Throws if Firebase isn't configured on this server, or if the token is invalid/expired.
 */
export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  if (!ensureFirebase()) {
    throw new Error('Firebase is not configured on this server');
  }
  return admin.auth().verifyIdToken(idToken);
}
