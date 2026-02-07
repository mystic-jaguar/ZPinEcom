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
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
                    const response = await axios.post(`${BASE_URL}users/refresh-token`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
                    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
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
    if (error.response) {
        // Server responded with error
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
