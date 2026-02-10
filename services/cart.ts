import { ApiSuccessResponse, CartResponseObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface AddToCartData {
    productId: string;
    quantity: number;
}

export interface UpdateCartData {
    quantity: number;
}

export const cartService = {
    /**
     * Get user's cart with full details
     * GET /api/v1/cart
     */
    async getCart() {
        try {
            const response = await apiClient.get<ApiSuccessResponse<CartResponseObject>>('cart');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add product to cart
     * POST /api/v1/cart
     */
    async addToCart(data: AddToCartData) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{ message: string }>>('cart', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Update cart item quantity
     * PUT /api/v1/cart/:productId
     */
    async updateCartItem(productId: string, data: UpdateCartData) {
        try {
            const response = await apiClient.put<ApiSuccessResponse<{ message: string }>>(`cart/${productId}`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Remove item from cart
     * DELETE /api/v1/cart/:productId
     */
    async removeFromCart(productId: string) {
        try {
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>(`cart/${productId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Clear entire cart
     * DELETE /api/v1/cart
     */
    async clearCart() {
        try {
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>('cart');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get cart item count
     * GET /api/v1/cart/count
     */
    async getCartCount() {
        try {
            const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>('cart/count');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
