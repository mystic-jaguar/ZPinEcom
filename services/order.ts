import { ApiPaginatedResponse, ApiSuccessResponse, OrderObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface CreateOrderData {
    cartItems: string[];          // Array of cart item IDs
    shippingAddressId: string;    // Address ID or full address object
    paymentMethod: 'razorpay' | 'cod';
    notes?: string;
    couponCode?: string;
}

export interface OrderListParams {
    page?: number;
    limit?: number;
    status?: string;              // pending, confirmed, delivered, etc.
    dateFrom?: string;            // YYYY-MM-DD
    dateTo?: string;              // YYYY-MM-DD
}

export interface CancelOrderData {
    reason: string;
    refundMethod?: 'original' | 'wallet';
}

export const orderService = {
    /**
     * Create new order from cart items
     */
    async createOrder(data: CreateOrderData) {
        try {
            // POST :- /api/v1/orders
            const response = await apiClient.post<ApiSuccessResponse<{
                order: OrderObject;
                orderItems: any[];
                paymentDetails: any;
            }>>('orders', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get user's orders with pagination and filtering
     */
    async getOrders(params?: OrderListParams) {
        try {
            // GET :- /api/v1/orders
            const response = await apiClient.get<ApiPaginatedResponse<OrderObject>>('orders', { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get specific order details
     */
    async getOrderById(id: string) {
        try {
            // GET :- /api/v1/orders/:id
            const response = await apiClient.get<ApiSuccessResponse<{
                order: OrderObject;
                orderItems: any[];
                statusHistory: any[];
            }>>(`orders/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Cancel order
     */
    async cancelOrder(id: string, data: CancelOrderData) {
        try {
            // PUT :- /api/v1/orders/:id/cancel
            const response = await apiClient.put<ApiSuccessResponse<{
                message: string;
                refundAmount: number;
                refundStatus: string;
            }>>(`orders/${id}/cancel`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get order tracking information
     */
    async trackOrder(id: string) {
        try {
            // GET :- /api/v1/orders/:id/track
            const response = await apiClient.get<ApiSuccessResponse<{
                trackingNumber: string;
                currentStatus: string;
                estimatedDelivery: string;
                trackingHistory: any[];
            }>>(`orders/${id}/track`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Initiate return request
     */
    async returnOrder(id: string, data: {
        orderItemIds: string[];
        reason: string;
        description?: string;
        images?: string[];
    }) {
        try {
            // POST :- /api/v1/orders/:id/return
            const response = await apiClient.post<ApiSuccessResponse<{
                returnId: string;
                status: string;
                message: string;
            }>>(`orders/${id}/return`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Download order invoice
     */
    async downloadInvoice(id: string) {
        try {
            // GET :- /api/v1/orders/:id/invoice
            const response = await apiClient.get(`orders/${id}/invoice`, {
                responseType: 'blob',
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
