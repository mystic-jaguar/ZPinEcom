import NetInfo from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

// Connectivity state driven by NetInfo, not by whether the last request failed.
// `isOnline` means "reachable", not merely "an interface is up" — a phone joined
// to a captive-portal wifi reports connected but nothing reaches the API, and
// NetInfo's own reachability probe is what distinguishes the two.
interface NetworkContextType {
    isOnline: boolean;
    /** Flips true the moment connectivity comes back after a loss, so screens can refetch. */
    justReconnected: boolean;
    /** Register a callback to run when connectivity is restored. Returns an unsubscribe. */
    onReconnect: (cb: () => void) => () => void;
}

const NetworkContext = createContext<NetworkContextType>({
    isOnline: true,
    justReconnected: false,
    onReconnect: () => () => { },
});

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [justReconnected, setJustReconnected] = useState(false);
    const wasOffline = useRef(false);
    const listeners = useRef(new Set<() => void>());

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            // isInternetReachable is null while the probe is still in flight —
            // treat "unknown" as online so a slow probe never shows a false
            // offline banner on a good connection.
            const online = state.isConnected === true && state.isInternetReachable !== false;
            setIsOnline(online);

            if (!online) {
                wasOffline.current = true;
            } else if (wasOffline.current) {
                wasOffline.current = false;
                setJustReconnected(true);
                listeners.current.forEach(cb => {
                    try { cb(); } catch (e) { console.warn('onReconnect handler failed', e); }
                });
                setTimeout(() => setJustReconnected(false), 3000);
            }
        });
        return unsubscribe;
    }, []);

    const onReconnect = React.useCallback((cb: () => void) => {
        listeners.current.add(cb);
        return () => { listeners.current.delete(cb); };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline, justReconnected, onReconnect }}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => useContext(NetworkContext);
