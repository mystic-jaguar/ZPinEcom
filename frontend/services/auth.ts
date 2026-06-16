import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import apiClient, { handleApiError, tokenManager, userDataManager } from './api';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

const getGoogleSignInConfig = () => {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the app.');
  }

  const config: Record<string, any> = {
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: [
      'https://www.googleapis.com/auth/user.birthday.read',
      'https://www.googleapis.com/auth/user.gender.read',
    ],
  };

  if (GOOGLE_ANDROID_CLIENT_ID) config.androidClientId = GOOGLE_ANDROID_CLIENT_ID;
  if (GOOGLE_IOS_CLIENT_ID) config.iosClientId = GOOGLE_IOS_CLIENT_ID;

  return config;
};

const normalizeGoogleSignInError = (error: any, statusCodes?: Record<string, string>) => {
  const code = error?.code;
  const developerError =
    code === 10 ||
    code === 'DEVELOPER_ERROR' ||
    (statusCodes?.DEVELOPER_ERROR && code === statusCodes.DEVELOPER_ERROR);

  if (!developerError) return error;

  const friendly = new Error(
    'Google Sign-In is misconfigured for this build. Add the Play App Signing SHA-1 to the OAuth Android client for com.zpin.ecom, then rebuild the app.'
  );
  (friendly as any).code = code;
  return friendly;
};

export interface SignupData {
    name: string;
    email: string;
    mobile: string;
    password: string;
    userName?: string;
    userRole?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export const authService = {
    /**
     * User signup
     */
    async signup(data: SignupData) {
        try {
            // POST :- /api/v1/auth/signup
            const response = await apiClient.post('auth/signup', {
                userName: data.email.split('@')[0], // Generate username from email
                mobile: data.mobile,
                userRole: 'customer',
                password: data.password,
                email: data.email,
                name: data.name,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * User login
     */
    async login(email: string, password: string) {
        try {
            if (__DEV__) {
                console.log('[Auth] Login attempt:', email);
            }
            const response = await apiClient.post('auth/login', { email, password });
            const data = response.data;

            if (data.accessToken) {
                await tokenManager.setTokens(data.accessToken, data.refreshToken);
            }
            if (data.user) {
                await userDataManager.setUserData(data.user);
            }

            return data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Send OTP for verification
     */
    async sendOTP(email: string) {
        try {
            // POST :- /api/v1/auth/verification/sendOTP
            const response = await apiClient.post('auth/verification/sendOTP', {
                email,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Verify OTP
     */
    async verifyOTP(email: string, otp: string) {
        try {
            // POST :- /api/v1/auth/verification/verifyOTP
            const response = await apiClient.post('auth/verification/verifyOTP', {
                email,
                otp,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            // Clear Google Sign-In session if active
            await googleAuthService.signOut();
        } catch {
            // Ignore — Google module may not be available or no active session
        }

        try {
            // Notify the backend so it can invalidate the refresh token server-side
            const refreshToken = await tokenManager.getRefreshToken();
            if (refreshToken) {
                await apiClient.post('auth/logout', { refreshToken }).catch(() => {});
            }
        } catch {
            // Ignore — if server is unreachable, we still clear locally
        }

        // Always clear local data regardless of server response
        await tokenManager.clearTokens();
        await userDataManager.clearUserData();

        // Clear all app data contexts
        try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.multiRemove([
                '@ZPinEcom:cart',
                '@ZPinEcom:wishlist',
                '@ZPinEcom:paymentCards',
                '@ZPinEcom:paymentUPIs',
                '@ZPinEcom:recentSearches',
                '@ZPinEcom:userPreferences'
            ]);
        } catch (storageError) {
            console.error('Error clearing AsyncStorage:', storageError);
        }
    },

    /**
     * Permanently delete the current user's account (App Store 5.1.1(v)).
     * Server anonymizes the account and removes personal data; on success we
     * clear all local session + cached data so the app returns to a logged-out
     * state. Throws (without clearing anything) if the server call fails.
     */
    async deleteAccount() {
        try {
            await apiClient.delete('users/me');
        } catch (error) {
            throw new Error(handleApiError(error));
        }

        // Account is gone server-side — tear down the local session. Mirror the
        // local-clear steps from logout() (but skip the auth/logout call, which
        // would now fail).
        try {
            await googleAuthService.signOut();
        } catch {
            // Ignore — Google module may not be available or no active session
        }
        await tokenManager.clearTokens();
        await userDataManager.clearUserData();

        try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.multiRemove([
                '@ZPinEcom:cart',
                '@ZPinEcom:wishlist',
                '@ZPinEcom:paymentCards',
                '@ZPinEcom:paymentUPIs',
                '@ZPinEcom:recentSearches',
                '@ZPinEcom:userPreferences'
            ]);
        } catch (storageError) {
            console.error('Error clearing AsyncStorage:', storageError);
        }
    },

    /**
     * Send OTP for password reset
     */
    async sendPasswordResetOTP(mobile: string, email: string) {
        try {
            // POST :- /api/v1/auth/forgetPassword/sendOTP
            const response = await apiClient.post('auth/forgetPassword/sendOTP', {
                mobile,
                email,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Verify OTP for password reset
     */
    async verifyPasswordResetOTP(mobile: string, email: string, otp: string) {
        try {
            // POST :- /api/v1/auth/forgetPassword/verifyOTP
            const response = await apiClient.post('auth/forgetPassword/verifyOTP', {
                mobile,
                email,
                otp,
            });
            return response.data; // Returns resetToken
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Reset password using reset token
     */
    async resetPassword(resetToken: string, newPassword: string) {
        try {
            // POST :- /api/v1/auth/forgetPassword/resetPassword
            const response = await apiClient.post('auth/forgetPassword/resetPassword', {
                resetToken,
                newPassword,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        return await tokenManager.isAuthenticated();
    },

    /**
     * Get current user data from storage
     */
    async getCurrentUser() {
        return await userDataManager.getUserData();
    },
};

/**
 * Google Sign-In
 */
export const googleAuthService = {
  async signIn(): Promise<{ idToken: string; accessToken: string }> {
    let GoogleSignin: any;
    let statusCodes: Record<string, string> | undefined;
    let isSuccessResponse: ((r: any) => boolean) | undefined;
    let isCancelledResponse: ((r: any) => boolean) | undefined;
    try {
      const mod = await import('@react-native-google-signin/google-signin');
      GoogleSignin = mod.GoogleSignin;
      statusCodes = mod.statusCodes;
      isSuccessResponse = mod.isSuccessResponse;
      isCancelledResponse = mod.isCancelledResponse;
    } catch {
      throw new Error('Google Sign-In is not available in this build. Please use email/password login.');
    }

    GoogleSignin.configure(getGoogleSignInConfig());

    try {
      await GoogleSignin.hasPlayServices();
    } catch {
      throw new Error('Google Play Services not available on this device.');
    }

    // Clear the local Google session so the account picker always appears.
    // Only signOut() is needed here — revokeAccess() is too aggressive and can
    // leave internal state inconsistent (e.g. when offline), causing the picker
    // to be skipped on the subsequent signIn() call.
    try {
      await GoogleSignin.signOut();
    } catch {
      // ignore — no active session
    }

    let response: any;
    try {
      response = await GoogleSignin.signIn();
    } catch (error: any) {
      throw normalizeGoogleSignInError(error, statusCodes);
    }

    // v13+ returns a typed response object — check it before calling getTokens()
    if (isCancelledResponse && isCancelledResponse(response)) {
      const err: any = new Error('SIGN_IN_CANCELLED');
      err.code = 'SIGN_IN_CANCELLED';
      throw err;
    }

    if (isSuccessResponse && !isSuccessResponse(response)) {
      throw new Error('Google sign-in did not return a successful response.');
    }

    // Extract idToken from the signIn() response (v13+ API)
    const idToken: string | undefined =
      response?.data?.idToken ?? response?.idToken;

    if (!idToken) throw new Error('Failed to get Google ID token');

    // signIn() does NOT return the OAuth accessToken — we must call getTokens()
    // to obtain it. The backend needs this to call the Google People API for
    // fetching the user's birthday and gender.
    let accessToken = '';
    try {
      const tokens = await GoogleSignin.getTokens();
      accessToken = tokens.accessToken || '';
    } catch {
      // If getTokens() fails, proceed without accessToken — the backend will
      // simply skip the People API call (dob/gender won't be auto-filled).
    }

    return { idToken, accessToken };
  },

  async signOut() {
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure(getGoogleSignInConfig());
      // Only call signOut() to clear the local session. Avoid revokeAccess()
      // here — it makes a network call that can fail and leave internal state
      // inconsistent, which prevents the account picker from appearing on the
      // next sign-in attempt.
      try {
        await GoogleSignin.signOut();
      } catch {
        // ignore if not signed in
      }
    } catch {
      // ignore — native module may not be available
    }
  },

  async authenticateWithBackend(idToken: string, accessToken?: string) {
    const response = await apiClient.post('auth/google', { idToken, accessToken });
    const data = response.data;
    if (data.accessToken) {
      await tokenManager.setTokens(data.accessToken, data.refreshToken);
    }
    if (data.user) {
      await userDataManager.setUserData(data.user);
    }
    return data;
  },
};

/**
 * Sign in with Apple (iOS only) — App Store guideline 4.8.
 */
async function generateAppleNonce(length = 32): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const appleAuthService = {
  /** True only on a device/build where Sign in with Apple is supported. */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async signIn(): Promise<{
    identityToken: string;
    rawNonce: string;
    fullName: AppleAuthentication.AppleAuthenticationCredential['fullName'];
  }> {
    // Send Apple the SHA256 hash of a random nonce; keep the raw value to prove
    // possession to our backend (replay protection).
    const rawNonce = await generateAppleNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Failed to get Apple identity token');
    }

    return {
      identityToken: credential.identityToken,
      rawNonce,
      // fullName + email are only returned on the FIRST authorization.
      fullName: credential.fullName ?? null,
    };
  },

  async authenticateWithBackend(
    identityToken: string,
    rawNonce: string,
    fullName: AppleAuthentication.AppleAuthenticationCredential['fullName']
  ) {
    const response = await apiClient.post('auth/apple', {
      identityToken,
      rawNonce,
      fullName: fullName
        ? { givenName: fullName.givenName, familyName: fullName.familyName }
        : undefined,
    });
    const data = response.data;
    if (data.accessToken) {
      await tokenManager.setTokens(data.accessToken, data.refreshToken);
    }
    if (data.user) {
      await userDataManager.setUserData(data.user);
    }
    return data;
  },
};
