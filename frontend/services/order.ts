import { ApiPaginatedResponse, ApiSuccessResponse, OrderObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface CreateOrderData {
    cartItems: { productId: string; quantity: number }[];
    shippingAddressId: string;
    paymentMethod: 'razorpay' | 'cod';
    paymentId?: string;
    deliveryBoyId?: string;
    notes?: string;
    couponCode?: string;
    deliveryFee?: number;
    couponDiscount?: number; // kept for backward compat but ignored by backend
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
    refundMethod?: 'original';
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
                orderItems: any[]; // Ideally should be OrderItemObject[]
                paymentDetails?: any;
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
            // GET :- /api/v1/users/orders (GET /api/v1/orders is 404 on deployed backend)
            const response = await apiClient.get<ApiPaginatedResponse<OrderObject>>('users/orders', { params });
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
            // PATCH :- /api/v1/orders/:id/cancel
            const response = await apiClient.patch<ApiSuccessResponse<{
                message: string;
                refundAmount: number;
                refundStatus: string;
            }>>(`orders/${id}/cancel`, data);
            return response.data;
        } catch (error: any) {
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
     * Get return request status for an order
     */
    async getReturnStatus(id: string) {
        try {
            // GET :- /api/v1/orders/:id/return-status
            const response = await apiClient.get<ApiSuccessResponse<{
                returnId: string;
                orderId: string;
                orderNumber: string;
                orderStatus: string;
                returnStatus: string;
                reason: string;
                description?: string;
                orderItemIds: string[];
                requestedAt: string;
                updatedAt: string;
            }>>(`orders/${id}/return-status`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Download order invoice — not yet implemented on the backend.
     * Throws a clear error rather than hitting a 404.
     */
    async downloadInvoice(_id: string): Promise<never> {
        throw new Error('Invoice download is not yet available.');
    },
};
