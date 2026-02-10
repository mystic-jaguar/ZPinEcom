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
     */
    async getCart() {
        try {
            // GET :- /api/v1/cart
            const response = await apiClient.get<ApiSuccessResponse<CartResponseObject>>('cart');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add product to cart
     */
    async addToCart(data: AddToCartData) {
        try {
            // POST :- /api/v1/cart
            const response = await apiClient.post<ApiSuccessResponse<{ message: string }>>('cart', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Update cart item quantity
     */
    async updateCartItem(productId: string, data: UpdateCartData) {
        try {
            // PUT :- /api/v1/cart/:productId
            const response = await apiClient.put<ApiSuccessResponse<{ message: string }>>(`cart/${productId}`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Remove item from cart
     */
    async removeFromCart(productId: string) {
        try {
            // DELETE :- /api/v1/cart/:productId
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>(`cart/${productId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Clear entire cart
     */
    async clearCart() {
        try {
            // DELETE :- /api/v1/cart
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>('cart');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get cart item count
     */
    async getCartCount() {
        try {
            // GET :- /api/v1/cart/count
            const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>('cart/count');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
