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
            // POST :- /api/v1/auth/login
            const response = await apiClient.post('auth/login', {
                email, // Can be email or username
                password,
            });

            // Store tokens if provided
            const data = response.data;
            const payload = data.data || data; // Handle wrapped or unwrapped response

            if (payload.accessToken) {
                await tokenManager.setTokens(
                    payload.accessToken,
                    payload.refreshToken
                );
            }

            // Store user data if provided
            // NEW: Cookie logic
            if (!payload.accessToken && response.headers['set-cookie']) {
                const cookies: string[] | string = response.headers['set-cookie'] as string[] | string;
                let tokenCookie = '';

                if (Array.isArray(cookies)) {
                    tokenCookie = cookies.find((c: string) => c.trim().startsWith('token=')) || '';
                } else if (typeof cookies === 'string' && cookies.trim().startsWith('token=')) {
                    tokenCookie = cookies;
                }

                if (tokenCookie) {
                    const token = tokenCookie.split(';')[0].split('=')[1];
                    console.log('Extracted token from cookie:', token.substring(0, 20) + '...');
                    await tokenManager.setTokens(token);

                    // Decode token to get userId
                    try {
                        const base64Url = token.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(
                            (global as any).atob(base64)
                                .split('')
                                .map(function (c: string) {
                                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                                })
                                .join('')
                        );

                        const decoded = JSON.parse(jsonPayload);

                        if (decoded.userId) {
                            // Dynamically import userService to avoid circular dependency
                            const { userService } = require('./user');
                            const userResponse = await userService.getUserById(decoded.userId);
                            if (userResponse.data) {
                                await userDataManager.setUserData(userResponse.data);
                                // Inject user into response data so login.tsx receives it
                                data.user = userResponse.data;
                            }
                        }
                    } catch (decodeError) {
                        console.error('Error decoding token from cookie:', decodeError);
                    }
                }
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
