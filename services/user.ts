import { ApiPaginatedResponse, ApiSuccessResponse, UserObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface UpdateProfileData {
    userName?: string;
    name?: string;
    dob?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gender?: string;
    profileImage?: File;  // New image file to upload
}

export const userService = {
    /**
     * Get all users (admin/public endpoint)
     */
    async getUsers(page?: number, limit?: number) {
        try {
            // GET :- /api/v1/users
            const response = await apiClient.get<ApiPaginatedResponse<UserObject>>('users', {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get specific user by ID
     */
    async getUserById(id: string) {
        try {
            // GET :- /api/v1/users/:id
            const response = await apiClient.get<ApiSuccessResponse<UserObject>>(`users/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get user's orders
     */
    async getUserOrders(page?: number, limit?: number) {
        try {
            // GET :- /api/v1/users/orders
            const response = await apiClient.get<ApiPaginatedResponse<any>>('users/orders', {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Update user profile
     */
    async updateProfile(data: FormData) {
        try {
            // PUT :- /api/v1/users/profileDetails
            const response = await apiClient.put<ApiSuccessResponse<{ message: string }>>('users/profileDetails', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add customer profile details
     */
    async addCustomerProfile(data: FormData) {
        try {
            // POST :- /api/v1/users/customer/profile
            const response = await apiClient.post<ApiSuccessResponse<any>>('users/customer/profile', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add shipping address
     */
    async addShippingAddress(data: {
        name: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
        landmark?: string;
        label: string;
        coordinates?: [number, number];
        isDefault: boolean;
    }) {
        try {
            // POST :- /api/v1/users/shipping-address
            const response = await apiClient.post<ApiSuccessResponse<any>>('users/shipping-address', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
