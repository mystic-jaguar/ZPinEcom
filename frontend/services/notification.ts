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
