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
    // Wallet balance is only ever changed server-side inside the order and
    // cancel/return transactions — there are no client credit/debit calls.
};
