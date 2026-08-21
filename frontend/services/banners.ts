import apiClient, { handleApiError } from './api';

export interface PromoBanner {
    id: string;
    title: string;
    subtitle?: string | null;
    imageUrl?: string | null;
    actionUrl?: string | null;
    bgColor?: string | null;
}

export const bannerService = {
    /**
     * Home-page promo banners. Authored ONLY in the admin panel; this is a
     * read-only view of the same `promo_banners` table the website reads.
     */
    async getBanners(): Promise<PromoBanner[]> {
        try {
            const res = await apiClient.get<{ success: boolean; data: PromoBanner[] }>('banners');
            return res.data?.data ?? [];
        } catch (error) {
            handleApiError(error);
            return [];
        }
    },
};
