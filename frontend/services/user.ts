import { ApiPaginatedResponse, ApiSuccessResponse, OrderObject, UserDetailsObject } from '../types/types';
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
     * Get specific user by ID
     */
    async getUserById(id: string) {
        try {
            // GET :- /api/v1/users/:id
            const response = await apiClient.get<any>(`users/${id}`);
            const raw = response.data?.data || response.data;
            // Normalize _id to id (backend MongoDB returns _id)
            return {
                success: true,
                data: raw
                    ? { ...raw, id: raw.id || raw._id || '' } as any
                    : null,
            };
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
            const response = await apiClient.get<ApiPaginatedResponse<OrderObject>>('users/orders', {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Update user profile (JSON body)
     */
    async updateProfileJson(data: { name?: string; userName?: string; dob?: string; gender?: string }) {
        try {
            const response = await apiClient.put('users/profileDetails', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Update user profile (multipart/form-data)
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
     * Add customer profile details — not yet implemented on the backend.
     * Throws a clear error rather than hitting a 404.
     */
    async addCustomerProfile(_data: FormData): Promise<never> {
        throw new Error('Customer profile creation is not yet available.');
    },

    /**
     * Get shipping addresses
     */
    async getShippingAddresses() {
        try {
            const response = await apiClient.get<any>('users/shipping-addresses');
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
            const response = await apiClient.post<ApiSuccessResponse<UserDetailsObject>>('users/shipping-address', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Block another user — hides their product reviews from you (App Store 1.2).
     */
    async blockUser(userId: string) {
        try {
            // POST :- /api/v1/users/block
            const response = await apiClient.post('users/block', { userId });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Unblock a previously blocked user.
     */
    async unblockUser(userId: string) {
        try {
            // DELETE :- /api/v1/users/block/:userId
            const response = await apiClient.delete(`users/block/${userId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
