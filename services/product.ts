import { ApiPaginatedResponse, ApiSuccessResponse, ProductObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface ProductListParams {
    page?: number;
    limit?: number;
    lat?: number;      // User latitude for 25km radius search
    lng?: number;      // User longitude for 25km radius search
    city?: string;     // Fallback location filter
    state?: string;    // Fallback location filter
    pincode?: string;  // Fallback location filter
}

export interface CreateProductData {
    productName: string;
    description: string;
    categoryId: string;
    deepestCategoryName: string;
    categoryPath: string;  // JSON stringified array
    price: number;
    quantity: number;
    images: File[];        // Multiple image files
}

export const productService = {
    /**
     * Get all products with optional location-based filtering
     * GET /api/v1/products
     */
    async getProducts(params?: ProductListParams) {
        try {
            const response = await apiClient.get<ApiPaginatedResponse<ProductObject>>('products', { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get specific product by ID
     * GET /api/v1/products/:id
     */
    async getProductById(id: string) {
        try {
            const response = await apiClient.get<ApiSuccessResponse<ProductObject>>(`products/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Create new product (seller only)
     * POST /api/v1/products/addProduct
     */
    async createProduct(data: FormData) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<ProductObject>>('products/addProduct', data, {
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
     * Update product (seller only - own products)
     * PUT /api/v1/products/:id
     */
    async updateProduct(id: string, data: Partial<ProductObject>) {
        try {
            const response = await apiClient.put<ApiSuccessResponse<ProductObject>>(`products/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Delete product (seller only - own products)
     * DELETE /api/v1/products/:id
     */
    async deleteProduct(id: string) {
        try {
            const response = await apiClient.delete<ApiSuccessResponse<any>>(`products/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get products by seller
     * GET /api/v1/products/seller/:userId
     */
    async getProductsBySeller(userId: string, page?: number, limit?: number) {
        try {
            const response = await apiClient.get<ApiPaginatedResponse<ProductObject>>(`products/seller/${userId}`, {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get products by category
     * GET /api/v1/products/category/:categoryId
     */
    async getProductsByCategory(categoryId: string, params?: ProductListParams) {
        try {
            const response = await apiClient.get<ApiPaginatedResponse<ProductObject>>(`products/category/${categoryId}`, {
                params,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
