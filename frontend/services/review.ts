import { ApiPaginatedResponse, ApiSuccessResponse, ReviewObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface CreateReviewData {
    rating: number;
    comment: string;
    images?: string[];
}

export const reviewService = {
    /**
     * Get reviews for a product
     */
    async getProductReviews(productId: string, page?: number, limit?: number) {
        try {
            // GET :- /api/v1/products/:id/reviews
            const response = await apiClient.get<ApiPaginatedResponse<ReviewObject>>(`products/${productId}/reviews`, {
                params: { page, limit },
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
};
