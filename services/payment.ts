import { ApiSuccessResponse } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface CreatePaymentData {
    orderId: string;
    amount: number;
    currency: string;
    method: 'razorpay' | 'cod' | 'wallet';
}

export interface VerifyPaymentData {
    paymentId: string;
    signature: string;
    orderId: string;
}

export const paymentService = {
    /**
     * Create payment intent for order
     * POST /api/v1/payments/create
     */
    async createPayment(data: CreatePaymentData) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                payment: any;
                gatewayData: {
                    key: string;
                    orderId: string;
                    amount: number;
                    currency: string;
                    name: string;
                    description: string;
                };
            }>>('payments/create', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Verify payment after gateway response
     * POST /api/v1/orders/:id/payment/verify
     */
    async verifyPayment(orderId: string, data: VerifyPaymentData) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                message: string;
                paymentStatus: string;
                order: any;
            }>>(`orders/${orderId}/payment/verify`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Retry payment for failed orders
     * POST /api/v1/orders/:id/payment/retry
     */
    async retryPayment(orderId: string, paymentMethod: 'razorpay' | 'cod' | 'wallet') {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                paymentDetails: {
                    paymentId: string;
                    amount: number;
                    currency: string;
                };
            }>>(`orders/${orderId}/payment/retry`, { paymentMethod });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get payment details
     * GET /api/v1/payments/:id
     */
    async getPaymentDetails(paymentId: string) {
        try {
            const response = await apiClient.get<ApiSuccessResponse<{
                payment: any;
                order: any;
            }>>(`payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Request refund
     * POST /api/v1/payments/:id/refund
     */
    async requestRefund(paymentId: string, amount?: number, reason?: string) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                refund: {
                    id: string;
                    paymentId: string;
                    amount: number;
                    status: string;
                    gatewayRefundId: string;
                    reason: string;
                    createdAt: string;
                };
            }>>(`payments/${paymentId}/refund`, { amount, reason });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Confirm COD payment
     * POST /api/v1/payments/cod/confirm
     */
    async confirmCOD(orderId: string, collectedAmount: number, deliveryPersonId: string) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                payment: any;
                order: any;
            }>>('payments/cod/confirm', {
                orderId,
                collectedAmount,
                deliveryPersonId,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
