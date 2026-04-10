import { ApiPaginatedResponse, ApiSuccessResponse, ReviewObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface CreateReviewData {
    rating: number;
    comment: string;
    images?: string[];
}

export interface UpdateReviewData {
    rating?: number;
    comment?: string;
    images?: string[];
}

export const reviewService = {
    /**
     * Get reviews for a product
     */
    async getProductReviews(productId: string, page?: number, limit?: number, mine?: boolean) {
        try {
            // GET :- /api/v1/products/:id/reviews
            const response = await apiClient.get<ApiPaginatedResponse<ReviewObject>>(`products/${productId}/reviews`, {
                params: { page, limit, mine },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Add a review for a product
     */
    async addProductReview(productId: string, data: CreateReviewData) {
        try {
            // POST :- /api/v1/products/:id/reviews
            const response = await apiClient.post<ApiSuccessResponse<{ message: string }>>(`products/${productId}/reviews`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Update an existing review for a product
     */
    async updateProductReview(productId: string, reviewId: string, data: UpdateReviewData) {
        try {
            // PUT :- /api/v1/products/:id/reviews/:reviewId
            const response = await apiClient.put<ApiSuccessResponse<{ message: string }>>(
                `products/${productId}/reviews/${reviewId}`,
                data
            );
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Delete a review from a product
     */
    async deleteProductReview(productId: string, reviewId: string) {
        try {
            // DELETE :- /api/v1/products/:id/reviews/:reviewId
            const response = await apiClient.delete<ApiSuccessResponse<{ message: string }>>(
                `products/${productId}/reviews/${reviewId}`
            );
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
