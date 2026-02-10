import { ApiPaginatedResponse, ApiSuccessResponse, ProductObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface WishlistParams {
    page?: number;
    limit?: number;
}

export const wishlistService = {
    /**
     * Get user's wishlist with pagination
     */
    async getWishlist(params?: WishlistParams) {
        try {
            // GET :- /api/v1/wishlist
            const response = await apiClient.get<ApiPaginatedResponse<ProductObject>>('wishlist', { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get wishlist item count
     */
    async getWishlistCount() {
        try {
            // GET :- /api/v1/wishlist/count
            const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>('wishlist/count');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add product to wishlist
     */
    async addToWishlist(productId: string) {
        try {
            // POST :- /api/v1/wishlist
            const response = await apiClient.post<ApiSuccessResponse<{ message: string }>>('wishlist', { productId });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Remove product from wishlist
     */
    async removeFromWishlist(productId: string) {
        try {
            // DELETE :- /api/v1/wishlist/:productId
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>(`wishlist/${productId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Clear entire wishlist
     */
    async clearWishlist() {
        try {
            // DELETE :- /api/v1/wishlist/clear
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>('wishlist/clear');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
