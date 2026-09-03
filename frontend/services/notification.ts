import { ApiPaginatedResponse, ApiSuccessResponse } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    data: { orderId?: string; orderNumber?: string; status?: string; groupId?: string | null;[k: string]: any };
    isRead: boolean;
    createdAt: string;
}

/**
 * Where a notification should land the customer.
 *
 * Shared by the inbox screen (tapping a row) and the push tap handler
 * (`useNotificationTaps` in ./push) so a notification opens the same screen
 * whether it was tapped in the app or on the lock screen.
 *
 * Returns null when there is nothing to open — a notification with no orderId.
 */
export function routeForNotification(
    data: NotificationItem['data'] | undefined
): { pathname: string; params: Record<string, string> } | null {
    const orderId = data?.orderId;
    if (!orderId) return null;
    // An order still moving has a live tracking screen; anything settled
    // (delivered, cancelled, refunded) reads better on the order details page.
    const live = ['shipped', 'out_for_delivery', 'processing'].includes(data?.status || '');
    // order-details keys on groupId when the order was split across sellers
    const params: Record<string, string> = { orderId: String(orderId) };
    if (!live && data?.groupId) params.groupId = String(data.groupId);
    return { pathname: live ? '/profile/track-order' : '/profile/order-details', params };
}

export const notificationService = {
    /**
     * Get the customer inbox with pagination
     */
    async getNotifications(params?: { page?: number; limit?: number }) {
        try {
            // GET :- /api/v1/notifications
            const response = await apiClient.get<ApiPaginatedResponse<NotificationItem> & { unreadCount: number }>('notifications', { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Unread count for the header badge
     */
    async getUnreadCount() {
        try {
            // GET :- /api/v1/notifications/unread-count
            // count is returned at the top level, not nested under `data`
            const response = await apiClient.get<{ success: boolean; count: number }>('notifications/unread-count');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Mark one notification as read
     */
    async markRead(id: string) {
        try {
            // POST :- /api/v1/notifications/:id/read
            const response = await apiClient.post<ApiSuccessResponse<{}>>(`notifications/${id}/read`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Mark the whole inbox as read
     */
    async markAllRead() {
        try {
            // POST :- /api/v1/notifications/read-all
            const response = await apiClient.post<ApiSuccessResponse<{}>>('notifications/read-all');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
