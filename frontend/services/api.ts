import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// API Configuration
// URL is set via EXPO_PUBLIC_API_URL environment variable in .env
// Never hardcode IPs or credentials here — use .env (gitignored)
const ensureApiV1Base = (url: string): string => {
    const trimmed = url.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? `${trimmed}/` : `${trimmed}/api/v1/`;
};

const getExpoHostIp = (): string | null => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
        (Constants as any)?.manifest?.debuggerHost;

    if (!hostUri || typeof hostUri !== 'string') {
        return null;
    }

    return hostUri.split(':')[0] || null;
};

const isLocalAddress = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '10.0.2.2' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
        );
    } catch {
        return false;
    }
};

const resolveBaseUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;

    const hostIp = getExpoHostIp();

    if (__DEV__) {
        if (envUrl && !isLocalAddress(envUrl)) {
            return ensureApiV1Base(envUrl);
        }

        if (hostIp) {
            return `http://${hostIp}:5002/api/v1/`;
        }

        if (envUrl) {
            return ensureApiV1Base(envUrl);
        }
    } else if (envUrl) {
        return ensureApiV1Base(envUrl);
    }

    if (hostIp) {
        return `http://${hostIp}:5002/api/v1/`;
    }

    // Android emulator can't reach localhost of host machine directly.
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5002/api/v1/';
    }

    return 'http://localhost:5002/api/v1/';
};

const BASE_URL = resolveBaseUrl();

if (__DEV__) {
    console.log(`[API] Base URL: ${BASE_URL}`);
}

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

// Shared refresh promise to prevent concurrent token refresh race conditions.
// If multiple requests fail with 401 simultaneously, only one refresh call is made.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
        throw new Error('SESSION_EXPIRED');
    }
    const response = await axios.post(`${BASE_URL}auth/refresh-token`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
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
                originalRequest.headers.set('Cookie', `token=${accessToken}`);
                originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
                originalRequest.headers.set('x-auth-token', accessToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed — clear all auth state and force re-login
                await AsyncStorage.multiRemove([
                    STORAGE_KEYS.ACCESS_TOKEN,
                    STORAGE_KEYS.REFRESH_TOKEN,
                    STORAGE_KEYS.USER_DATA,
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
