import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
    SECURE_KEYS,
    ensureTokensMigrated,
    secureGet,
    secureRemove,
    secureSet,
} from './secureStorage';

// Hardcoded production fallback — used when EXPO_PUBLIC_API_URL is not baked into the build.
const PRODUCTION_API_URL = 'http://195.35.20.40:5002/api/v1/';

const resolveBaseUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && envUrl.trim()) {
        const trimmed = envUrl.trim().replace(/\/+$/, '');
        const base = trimmed.endsWith('/api/v1') ? `${trimmed}/` : `${trimmed}/api/v1/`;
        if (__DEV__) {
            console.log(`[API] Using env URL: ${base}`);
        }
        return base;
    }
    // Env var not set — fall back to production URL so the app doesn't crash.
    if (__DEV__) {
        console.warn('[API] EXPO_PUBLIC_API_URL is not set. Falling back to production URL.');
    }
    return PRODUCTION_API_URL;
};

const BASE_URL = resolveBaseUrl();

if (__DEV__) {
    console.log(`[API] Base URL: ${BASE_URL}`);
}

// AsyncStorage keys for NON-sensitive cache only.
// Auth tokens live in SecureStore (Keychain/Keystore) — see ./secureStorage.
export const STORAGE_KEYS = {
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
    'auth/google',
    'auth/forgetPassword',
    'auth/verification',
    'public/',
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
            config.headers.delete('Authorization');
            config.headers.delete('x-auth-token');
        } else {
            await ensureTokensMigrated();
            const token = await secureGet(SECURE_KEYS.ACCESS_TOKEN);
            if (token && token !== 'null' && token !== 'undefined') {
                // Use Authorization Bearer — the standard and most secure approach
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

// Shared refresh promise to prevent concurrent token refresh race conditions.
// If multiple requests fail with 401 simultaneously, only one refresh call is made.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
    await ensureTokensMigrated();
    const refreshToken = await secureGet(SECURE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
        throw new Error('SESSION_EXPIRED');
    }
    const response = await axios.post(`${BASE_URL}auth/refresh-token`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await secureSet(SECURE_KEYS.ACCESS_TOKEN, accessToken);
    if (newRefreshToken) {
        await secureSet(SECURE_KEYS.REFRESH_TOKEN, newRefreshToken);
    }
    return accessToken;
}

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 Unauthorized - Token expired (access token is now 15min)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Deduplicate: reuse in-flight refresh if one is already running
                if (!refreshPromise) {
                    refreshPromise = refreshAccessToken().finally(() => {
                        refreshPromise = null;
                    });
                }
                const accessToken = await refreshPromise;

                // Retry original request with new token
                originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
                originalRequest.headers.set('x-auth-token', accessToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed — clear all auth state and force re-login
                await Promise.all([
                    secureRemove(SECURE_KEYS.ACCESS_TOKEN),
                    secureRemove(SECURE_KEYS.REFRESH_TOKEN),
                    AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
                ]);
                // Signal to the app that auth is gone — UserContext will redirect to login
                return Promise.reject(new Error('SESSION_EXPIRED'));
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
        // Request made but no response — server unreachable or network issue
        if (__DEV__) {
            console.error('[API] No response received. Check that the backend is running and reachable at:', BASE_URL);
        }
        return 'Unable to reach the server. Please check your internet connection and try again.';
    } else {
        // Something else happened
        return error.message || 'An unexpected error occurred.';
    }
};

// Token management — backed by SecureStore (Keychain/Keystore).
export const tokenManager = {
    async setTokens(accessToken: string, refreshToken?: string) {
        await secureSet(SECURE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken) {
            await secureSet(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
        }
    },

    async getAccessToken() {
        await ensureTokensMigrated();
        return await secureGet(SECURE_KEYS.ACCESS_TOKEN);
    },

    async getRefreshToken() {
        await ensureTokensMigrated();
        return await secureGet(SECURE_KEYS.REFRESH_TOKEN);
    },

    async clearTokens() {
        await Promise.all([
            secureRemove(SECURE_KEYS.ACCESS_TOKEN),
            secureRemove(SECURE_KEYS.REFRESH_TOKEN),
        ]);
    },

    async isAuthenticated() {
        await ensureTokensMigrated();
        const token = await secureGet(SECURE_KEYS.ACCESS_TOKEN);
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
