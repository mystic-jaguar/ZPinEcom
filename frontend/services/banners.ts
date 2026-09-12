import apiClient, { handleApiError } from './api';

export interface PromoBanner {
    id: string;
    title: string;
    subtitle?: string | null;
    imageUrl?: string | null;
    actionUrl?: string | null;
    bgColor?: string | null;
}

/**
 * Which slot a banner was authored for. One call per slot; an empty result means
 * the caller renders its own built-in artwork instead of leaving a hole.
 * Anything other than `top_carousel` returns [] until the backend's
 * `promo_banners.placement` migration has run (see SCHEMA_CHANGES.md).
 */
export type BannerPlacement = 'top_carousel' | 'feed_inline' | 'category_hero';

export const bannerService = {
    /**
     * Promo banners for one slot. Authored ONLY in the admin panel; this is a
     * read-only view of the same `promo_banners` table the website reads.
     */
    async getBanners(placement: BannerPlacement = 'top_carousel'): Promise<PromoBanner[]> {
        try {
            const res = await apiClient.get<{ success: boolean; data: PromoBanner[] }>(
                `banners?placement=${placement}`
            );
            return res.data?.data ?? [];
        } catch (error) {
            handleApiError(error);
            return [];
        }
    },
};
