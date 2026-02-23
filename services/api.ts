import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';

// API Configuration
const BASE_URL_DEV = 'http://localhost:5000/api/v1/';
const BASE_URL_PROD = 'https://zpin-ecommerce-backend-997x.onrender.com/api/v1/';

// Use production URL by default (change to DEV for local testing)
const BASE_URL = BASE_URL_PROD;

// Storage keys
export const STORAGE_KEYS = {
    ACCESS_TOKEN: '@zpin_access_token',
    REFRESH_TOKEN: '@zpin_refresh_token',
    USER_DATA: '@zpin_user_data',
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 60000, // Increased timeout to 60s to handle Render backend cold starts
    headers: {
        'Content-Type': 'application/json',
    },
});

// Public endpoints that should NOT receive auth headers
const PUBLIC_ENDPOINTS = [
    'auth/login',
    'auth/signup',
    'auth/forgetPassword',
    'auth/verification',
    'public/',
    // Note: products listing is public but not reviews (products/:id/reviews need auth)
    // So we only exclude the base listing endpoints specifically
];

// Request interceptor - Add auth token to requests
// This backend uses HttpOnly cookie-based auth: token is sent as Cookie header
apiClient.interceptors.request.use(
    async (config) => {
        const url = config.url || '';
        const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => url.startsWith(endpoint));

        if (__DEV__) {
            console.log(`[API] ${config.method?.toUpperCase()} ${url} | public=${isPublicEndpoint}`);
        }

        if (isPublicEndpoint) {
            // Explicitly remove any auth headers for public endpoints
            config.headers.delete('Cookie');
            config.headers.delete('Authorization');
            config.headers.delete('x-auth-token');
        } else {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            if (token && token !== 'null' && token !== 'undefined') {
                // Primary: Send as Cookie header (backend uses HttpOnly cookie auth)
                config.headers.set('Cookie', `token=${token}`);
                // Fallbacks for compatibility
                config.headers.set('Authorization', `Bearer ${token}`);
                config.headers.set('x-auth-token', token);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                if (refreshToken) {
                    // POST :- /api/v1/users/refresh-token
                    const response = await axios.post(`${BASE_URL}users/refresh-token`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
                    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

                    // Retry original request with new token
                    originalRequest.headers.set('Cookie', `token=${accessToken}`);
                    originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
                    originalRequest.headers.set('x-auth-token', accessToken);
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed - logout user
                await AsyncStorage.multiRemove([
                    STORAGE_KEYS.ACCESS_TOKEN,
                    STORAGE_KEYS.REFRESH_TOKEN,
                    STORAGE_KEYS.USER_DATA,
                ]);
                // Redirect to login - handle this in the calling component
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// API Error Handler
export const handleApiError = (error: any): string => {
    if (!error) return 'An unknown error occurred.';
    if (error.response) {
        // Server responded with error
        if (__DEV__) {
            console.error('API Error Response:', {
                status: error.response.status,
                data: error.response.data,
            });
        } else {
            console.error('API Error Response:', {
                status: error.response.status,
                message: error.response.data?.message || 'Unknown error',
            });
        }
        const message = error.response.data?.message || error.response.data?.error;
        return message || 'An error occurred. Please try again.';
    } else if (error.request) {
        // Request made but no response
        return 'Network error. Please check your connection.';
    } else {
        // Something else happened
        return error.message || 'An unexpected error occurred.';
    }
};

// Token management
export const tokenManager = {
    async setTokens(accessToken: string, refreshToken?: string) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
    },

    async getAccessToken() {
        return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    },

    async getRefreshToken() {
        return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    async clearTokens() {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
        ]);
    },

    async isAuthenticated() {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        return !!token;
    },
};

// User data management
export const userDataManager = {
    async setUserData(userData: any) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    },

    async getUserData() {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    },

    async clearUserData() {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    },
};

export default apiClient;
