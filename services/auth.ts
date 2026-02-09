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
            const response = await apiClient.post('auth/login', {
                email, // Can be email or username
                password,
            });

            // Store tokens if provided
            if (response.data.accessToken) {
                await tokenManager.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken
                );
            }

            // Store user data if provided
            if (response.data.user) {
                await userDataManager.setUserData(response.data.user);
            }

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Send OTP for verification
     */
    async sendOTP(mobile: string) {
        try {
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
            await apiClient.post('auth/logout');
        } catch (error: any) {
            // Ignore 401 errors - token may have expired, which is fine for logout
            // Only log other unexpected errors
            if (error?.response?.status !== 401) {
                console.error('Logout API error:', error);
            }
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
