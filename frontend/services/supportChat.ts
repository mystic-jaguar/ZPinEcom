import apiClient from './api';

/**
 * Customer support chat — the same four endpoints and the same wire shapes the
 * customer website's ChatBot uses (`website-customer/src/Components/ChatBot.jsx`
 * against `/api/support-chat`). One thread per customer, shared with the
 * website, answered from zpin-admin's Customer Chats page.
 *
 * Every call here is best-effort: the FAQ bot works offline-of-the-backend, so
 * a caller that can't reach support still gets local answers. Failures are
 * surfaced as thrown errors and swallowed at the call site, not toasted.
 */

export type SupportThreadStatus = 'bot' | 'pending_human' | 'active_human' | 'resolved';

export type SupportSenderType = 'customer' | 'bot' | 'admin' | 'system';

export interface SupportMessageRow {
    id: string;
    sender_type: SupportSenderType;
    sender_name?: string | null;
    message: string;
    meta?: Record<string, any> | null;
    created_at: string;
}

interface ThreadResponse {
    success: boolean;
    thread?: { id: string; status: SupportThreadStatus };
    messages?: SupportMessageRow[];
}

export const supportChatApi = {
    /** `since` is the created_at of the newest row already held — the poll. */
    async thread(since?: string | null) {
        const response = await apiClient.get<ThreadResponse>('support-chat', {
            params: since ? { since } : {},
        });
        return {
            status: (response.data?.thread?.status ?? 'bot') as SupportThreadStatus,
            messages: (response.data?.messages ?? []) as SupportMessageRow[],
        };
    },

    async send(message: string, senderType: 'customer' | 'bot', meta?: Record<string, any>) {
        const response = await apiClient.post<{ success: boolean; message?: SupportMessageRow }>(
            'support-chat/messages',
            { message, senderType, meta },
        );
        return response.data?.message;
    },

    async handoff() {
        await apiClient.post('support-chat/handoff');
    },

    async resolve() {
        await apiClient.post('support-chat/resolve');
    },
};

export default supportChatApi;
