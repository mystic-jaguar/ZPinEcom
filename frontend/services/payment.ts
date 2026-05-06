import { ApiSuccessResponse } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface CreatePaymentData {
    orderId: string;
    amount: number;
    currency: string;
    method: 'razorpay' | 'cod' | 'wallet';
}

export interface VerifyPaymentData {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    appOrderId: string;
}

export const paymentService = {
    /**
     * Create a Razorpay order for the given app order ID
     */
    async createRazorpayOrder(orderId: string) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                razorpayOrderId: string;
                amount: number;
                currency: string;
                keyId: string;
                appOrderId: string;
            }>>('razorpay/create-order', { orderId });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Verify Razorpay payment signature with backend
     */
    async verifyRazorpayPayment(data: VerifyPaymentData) {
        try {
            const response = await apiClient.post<ApiSuccessResponse<{
                orderId: string;
                paymentId: string;
            }>>('razorpay/verify', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Request refund
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
};
