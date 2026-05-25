import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * Send OTP via Firebase Phone Auth.
 * phoneNumber must include country code e.g. "+919876543210"
 */
export async function sendFirebaseOTP(phoneNumber: string): Promise<void> {
  try {
    confirmationResult = await auth().signInWithPhoneNumber(phoneNumber);
  } catch (error: any) {
    console.error('[Firebase OTP Error]', error?.code, error?.message);
    throw error;
  }
}

/**
 * Confirm the OTP entered by the user.
 * Returns the Firebase ID token on success.
 */
export async function confirmFirebaseOTP(otp: string): Promise<string> {
  if (!confirmationResult) {
    throw new Error('No OTP request in progress. Please request OTP first.');
  }
  const credential = await confirmationResult.confirm(otp);
  if (!credential?.user) {
    throw new Error('OTP verification failed.');
  }
  const idToken = await credential.user.getIdToken();
  // Sign out from Firebase — we use our own JWT session
  await auth().signOut().catch(() => {});
  return idToken;
}
