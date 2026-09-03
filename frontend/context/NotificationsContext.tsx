import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationService } from '../services/notification';
import { useUser } from './UserContext';

/**
 * One unread count for the whole signed-in app.
 *
 * The header bell used to fetch this itself on every screen focus, so the badge
 * only moved when the customer navigated. A push arriving while the app is open
 * (order confirmed, out for delivery) now bumps it immediately, and the inbox
 * screen refreshes it after marking rows read instead of leaving it stale.
 *
 * ponytail: no polling loop — the backend's push is the event source, and focus
 * still refetches as a backstop. Add an interval only if pushes start arriving
 * that the app must react to without any notification being presented.
 */

interface NotificationsContextType {
    unread: number;
    refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useUser();
    const [unread, setUnread] = useState(0);

    const refresh = useCallback(() => {
        if (!isAuthenticated) return;
        notificationService.getUnreadCount()
            .then(r => setUnread(r.count ?? 0))
            .catch(() => { /* offline or a transient 5xx — the next trigger retries */ });
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            setUnread(0);
            return;
        }
        refresh();

        // A push landing in the foreground writes its row server-side first, so
        // the count is already current by the time we hear about it.
        const received = Notifications.addNotificationReceivedListener(() => refresh());
        // Tapping one marks it read on the inbox screen; coming back from the
        // background is also the cheapest moment to resync.
        const onAppState = (state: AppStateStatus) => { if (state === 'active') refresh(); };
        const appState = AppState.addEventListener('change', onAppState);

        return () => {
            received.remove();
            appState.remove();
        };
    }, [isAuthenticated, refresh]);

    return (
        <NotificationsContext.Provider value={{ unread, refresh }}>
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotificationsBadge = (): NotificationsContextType => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotificationsBadge must be used within a NotificationsProvider');
    }
    return context;
};
