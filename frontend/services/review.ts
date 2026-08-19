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

// A review may carry at most this many photos — same ceiling the composer draws.
export const MAX_REVIEW_IMAGES = 4;

export const reviewService = {
    /**
     * Upload one review photo and get back its hosted URL. The URL is what the
     * review POST/PUT stores in `images` — the backend never sees the local file
     * again.
     */
    async uploadReviewImage(uri: string) {
        try {
            const form = new FormData();
            const name = uri.split('/').pop() || 'review.jpg';
            const ext = (name.split('.').pop() || 'jpg').toLowerCase();
            // React Native's FormData takes this {uri,name,type} shape, not a File.
            form.append('image', { uri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
            const response = await apiClient.post<ApiSuccessResponse<{ url: string }>>('products/reviews/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data.data.url;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get reviews for a product
     */
    async getProductReviews(productId: string, page?: number, limit?: number, mine?: boolean) {
        try {
            // GET :- /api/v1/products/:id/reviews
            const response = await apiClient.get<ApiPaginatedResponse<ReviewObject> & { ratingCounts?: Record<string, number> }>(`products/${productId}/reviews`, {
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

    /**
     * Report a review as abusive/objectionable (App Store 1.2).
     */
    async reportProductReview(productId: string, reviewId: string, reason?: string) {
        try {
            // POST :- /api/v1/products/:id/reviews/:reviewId/report
            const response = await apiClient.post<ApiSuccessResponse<{ message: string; hidden: boolean }>>(
                `products/${productId}/reviews/${reviewId}/report`,
                { reason }
            );
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
