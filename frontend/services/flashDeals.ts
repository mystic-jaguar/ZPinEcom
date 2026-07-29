import apiClient, { handleApiError } from './api';

export interface FlashDeal {
    id: string;
    productId: string;
    productName: string;
    description?: string;
    originalPrice: number;
    dealPrice: number;
    discountPercent: number;
    images: string[];
    rating: number;
    stockRemaining: number;
    totalStock: number;
    endsAt: string;
    label: string;
}

export const flashDealService = {
    /**
     * Live flash deals. Deals are created/edited/expired ONLY in the admin panel;
     * this is a read-only view of the same `flash_deals` table the website reads.
     */
    async getFlashDeals(): Promise<FlashDeal[]> {
        try {
            const res = await apiClient.get<{ success: boolean; data: FlashDeal[] }>('flash-deals');
            return res.data?.data ?? [];
        } catch (error) {
            handleApiError(error);
            return [];
        }
    },
};
