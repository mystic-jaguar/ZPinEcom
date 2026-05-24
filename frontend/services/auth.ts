import apiClient, { handleApiError, tokenManager, userDataManager } from './api';

const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '19891056241-9sbuoqioho8e4r9jbpuau3dcna7js0i4.apps.googleusercontent.com').trim();
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
    async sendOTP(mobile: string) {
        try {
            // POST :- /api/v1/auth/verification/sendOTP
            const response = await apiClient.post('auth/verification/sendOTP', {
                mobile,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Verify OTP
     */
    async verifyOTP(mobile: string, otp: string) {
        try {
            // POST :- /api/v1/auth/verification/verifyOTP
            const response = await apiClient.post('auth/verification/verifyOTP', {
                mobile,
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
        } catch (error: any) {
            // Ignore 401 errors - token may have expired, which is fine for logout
            // Only log other unexpected errors
            // Ignore errors during logout - if server is unreachable or token expired,
            // we still want to clear local data and log the user out locally.
            // console.warn('Logout API warning:', error.message);
        } finally {
            // Always clear local data - Clear all AsyncStorage keys for complete logout
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

    // Fully clear any cached Google session so the account picker always appears.
    // revokeAccess() invalidates the OAuth grant; signOut() clears the local session.
    // Both must succeed (or be safely ignored) before calling signIn().
    try {
      await GoogleSignin.revokeAccess();
    } catch {
      // ignore — no access was previously granted
    }
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

    // Extract idToken directly from the response data (v13+ API) to avoid
    // getTokens() returning stale cached tokens from a previous session.
    const idToken: string | undefined =
      response?.data?.idToken ?? response?.idToken;
    const accessToken: string =
      response?.data?.accessToken ?? response?.accessToken ?? '';

    if (!idToken) throw new Error('Failed to get Google ID token');
    return { idToken, accessToken };
  },

  async signOut() {
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure(getGoogleSignInConfig());
      try {
        await GoogleSignin.revokeAccess();
      } catch {
        // ignore if access not granted
      }
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
