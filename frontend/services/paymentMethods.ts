import apiClient, { handleApiError } from './api';

export interface ApiCard {
    id: string;
    type: 'card';
    cardNumber: string;
    cardHolderName: string;
    expiryDate: string;
    cardType: string;
    bankName: string;
    iconName: string;
    iconColor: string;
}

export interface ApiUPI {
    id: string;
    type: 'upi';
    upiId: string;
    upiApp: 'Google Pay' | 'PhonePe' | 'Paytm';
    label: string;
    subLabel: string;
}

export type ApiPaymentMethod = ApiCard | ApiUPI;

export const paymentMethodsService = {
    async getAll(): Promise<ApiPaymentMethod[]> {
        try {
            const res = await apiClient.get<{ success: boolean; data: ApiPaymentMethod[] }>('payment-methods');
            return res.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async addCard(card: { cardNumber: string; cardHolderName: string; expiryDate: string; cardType: string }): Promise<ApiCard> {
        try {
            const res = await apiClient.post<{ success: boolean; data: ApiCard }>('payment-methods', { type: 'card', ...card });
            return res.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async addUPI(upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm'): Promise<ApiUPI> {
        try {
            const res = await apiClient.post<{ success: boolean; data: ApiUPI }>('payment-methods', { type: 'upi', upiId, upiApp });
            return res.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async updateCard(id: string, card: Partial<{ cardNumber: string; cardHolderName: string; expiryDate: string; cardType: string }>): Promise<ApiCard> {
        try {
            const res = await apiClient.put<{ success: boolean; data: ApiCard }>(`payment-methods/${id}`, card);
            return res.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async updateUPI(id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm'): Promise<ApiUPI> {
        try {
            const res = await apiClient.put<{ success: boolean; data: ApiUPI }>(`payment-methods/${id}`, { upiId, upiApp });
            return res.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async delete(id: string): Promise<void> {
        try {
            await apiClient.delete(`payment-methods/${id}`);
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
