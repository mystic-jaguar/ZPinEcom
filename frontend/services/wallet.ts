import apiClient, { handleApiError } from './api';

export interface WalletData {
    walletId: string;
    balance: number;
    transactions: WalletTransaction[];
}

export interface WalletTransaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    referenceId?: string;
    createdAt: string;
}

export const walletService = {
    async getWallet(): Promise<WalletData> {
        try {
            const response = await apiClient.get('wallet');
            return response.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async creditWallet(amount: number, description: string, referenceId?: string): Promise<{ newBalance: number }> {
        try {
            const response = await apiClient.post('wallet/credit', { amount, description, referenceId });
            return response.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async debitWallet(amount: number, description: string, referenceId?: string): Promise<{ newBalance: number }> {
        try {
            const response = await apiClient.post('wallet/debit', { amount, description, referenceId });
            return response.data.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
