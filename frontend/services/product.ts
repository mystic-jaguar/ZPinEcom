import { LocationInfo, PaginationObject, ProductObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface ProductListParams {
    page?: number;
    limit?: number;
    lat?: number;      // User latitude for 25km radius search
    lng?: number;      // User longitude for 25km radius search
    city?: string;     // Fallback location filter
    state?: string;    // Fallback location filter
    pincode?: string;  // Fallback location filter

    // Server-side sort/filter (category listing)
    sort?: 'relevance' | 'new' | 'price_low' | 'price_high' | 'rating';
    minRating?: number;   // 0-5; only products with avg rating >= this are returned
    brands?: string;      // comma-separated deepest-category names
    priceBands?: string;  // comma-separated "min-max" bands, e.g. "0-500,5000-"
}

export interface Shop {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    verified: boolean;
    product_count: number;
    rating: number | null;
    review_count: number;
    categories: string[]; // lowercase root category names
}

export const productService = {
    /** Shop directory — every active seller in the customer's zone. */
    async getShops(): Promise<Shop[]> {
        try {
            const response = await apiClient.get('products/shops');
            return response.data.shops || [];
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /** One shop and a page of its products, optionally filtered by name. */
    async getShop(sellerId: string, params?: { page?: number; limit?: number; q?: string }) {
        try {
            const response = await apiClient.get<{ shop: Shop; products: ProductObject[]; pagination: PaginationObject }>(
                `products/shops/${encodeURIComponent(sellerId)}`, { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get all products with optional location-based filtering
     */
    async getProducts(params?: ProductListParams) {
        try {
            // GET :- /api/v1/products
            // The API returns { products: [], pagination: {}, locationInfo: {} } directly
            const response = await apiClient.get<{
                products: ProductObject[];
                pagination: PaginationObject;
                locationInfo: LocationInfo;
            }>('products', { params });

            const products = response.data.products.map((p: any) => ({
                ...p,
                productId: p.productId || p.id || p._id,
                price: Number(p.price) || 0,
                categoryPath: p.categoryPath || 'All',
            }));

            return { ...response.data, products };
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get specific product by ID
     */
    async getProductById(id: string) {
        try {
            const response = await apiClient.get<any>(`products/${id}`);
            // Backend returns { success, data: { productId, price, ... } }
            const product = response.data?.data || response.data;
            return {
                ...product,
                productId: product.productId || product.id || product._id,
                price: Number(product.price) || 0,
                categoryPath: product.categoryPath || 'All',
            } as ProductObject;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get nearby category availability counts (for Nearby Availabilities section)
     */
    async getNearbyCategories(lat?: number, lng?: number): Promise<{ name: string; rootCategory: string; subCategory: string; count: number; imageUrl: string | null }[]> {
        try {
            const response = await apiClient.get('products/nearby', { params: { lat, lng } });
            return response.data.data || [];
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get personalized recommendations using purchase history, wishlist, and search terms.
     * Requires authentication. Falls back to search-term-based recommendations if unauthenticated.
     */
    async getPersonalizedRecommended(searchTerms: string[], limit = 10): Promise<ProductObject[]> {
        try {
            const params: Record<string, any> = { limit };
            if (searchTerms.length > 0) params.terms = searchTerms.slice(0, 5).join(',');

            const r = await apiClient.get('products/recommended', { params });
            return (r.data.products || []).map((p: any) => ({
                ...p,
                productId: p.productId || p.id,
                price: Number(p.price) || 0,
            }));
        } catch {
            // Not authenticated or server error — fall back to search-term logic
            return this.getRecommended(searchTerms, limit);
        }
    },

    /**
     * Get recommended products based on recent search terms.
     * Fetches products matching any of the search keywords.
     */
    async getRecommended(searchTerms: string[], limit = 10): Promise<ProductObject[]> {
        if (!searchTerms.length) {
            // No search history — fall back to latest products
            try {
                const r = await apiClient.get('products', { params: { limit } });
                return (r.data.products || []).map((p: any) => ({
                    ...p,
                    productId: p.productId || p.id,
                    price: Number(p.price) || 0,
                }));
            } catch { return []; }
        }

        try {
            // Fetch products for each unique term in parallel, deduplicate by productId
            const seen = new Set<string>();
            const results: ProductObject[] = [];

            await Promise.all(
                searchTerms.slice(0, 5).map(async (term) => {
                    try {
                        const r = await apiClient.get(`products/category/${encodeURIComponent(term)}`, { params: { limit: 6 } });
                        const items: any[] = r.data.products || [];
                        items.forEach(p => {
                            const id = p.productId || p.id;
                            if (!seen.has(id)) {
                                seen.add(id);
                                results.push({ ...p, productId: id, price: Number(p.price) || 0 });
                            }
                        });
                    } catch { /* term may not match any category */ }
                })
            );

            return results.slice(0, limit);
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get top 5 categories with the most recently added product (for Fresh Arrivals)
     */
    async getFreshCategories(): Promise<{ name: string; categoryPath: any; imageUrl: string | null; latestAt: string }[]> {
        try {
            const response = await apiClient.get('products/fresh-categories');
            return response.data.data || [];
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get products by category
     */
    async getProductsByCategory(categoryId: string, params?: ProductListParams) {
        try {
            // GET :- /api/v1/products/category/:categoryId
            const response = await apiClient.get<{
                success: boolean;
                products: ProductObject[];
                brands: string[];
                pagination: PaginationObject;
            }>(`products/category/${encodeURIComponent(categoryId)}`, {
                params,
            });

            const products = (response.data.products || []).map((p: any) => ({
                ...p,
                productId: p.productId || p.id || p._id,
                price: Number(p.price) || 0,
                categoryPath: p.categoryPath || 'All',
            }));

            return {
                ...response.data,
                products,
                brands: response.data.brands || [],
            };
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
