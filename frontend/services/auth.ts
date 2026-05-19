import apiClient, { handleApiError, tokenManager, userDataManager } from './api';

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
  async signIn(): Promise<{ idToken: string }> {
    let GoogleSignin: any;
    try {
      const mod = await import('@react-native-google-signin/google-signin');
      GoogleSignin = mod.GoogleSignin;
    } catch {
      throw new Error('Google Sign-In is not available in this build. Please use email/password login.');
    }

    GoogleSignin.configure({
      webClientId: '19891056241-au7693pc9k001li0d1968i7gfbrs2vkl.apps.googleusercontent.com',
      offlineAccess: false,
    });

    try {
      await GoogleSignin.hasPlayServices();
    } catch {
      throw new Error('Google Play Services not available on this device.');
    }

    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    if (!tokens.idToken) throw new Error('Failed to get Google ID token');
    return { idToken: tokens.idToken };
  },

  async signOut() {
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {
      // ignore — native module may not be available
    }
  },

  async authenticateWithBackend(idToken: string) {
    const response = await apiClient.post('auth/google', { idToken });
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
