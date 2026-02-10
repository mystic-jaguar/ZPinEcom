import { ApiPaginatedResponse, ApiSuccessResponse, ProductObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface WishlistParams {
    page?: number;
    limit?: number;
}

export const wishlistService = {
    /**
     * Get user's wishlist with pagination
     * GET /api/v1/wishlist
     */
    async getWishlist(params?: WishlistParams) {
        try {
            const response = await apiClient.get<ApiPaginatedResponse<ProductObject>>('wishlist', { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get wishlist item count
     * GET /api/v1/wishlist/count
     */
    async getWishlistCount() {
        try {
            const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>('wishlist/count');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add product to wishlist
     * POST /api/v1/wishlist
     */
    async addToWishlist(productId: string) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{ message: string }>>('wishlist', { productId });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Remove product from wishlist
     * DELETE /api/v1/wishlist/:productId
     */
    async removeFromWishlist(productId: string) {
        try {
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>(`wishlist/${productId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Clear entire wishlist
     * DELETE /api/v1/wishlist/clear
     */
    async clearWishlist() {
        try {
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>('wishlist/clear');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
