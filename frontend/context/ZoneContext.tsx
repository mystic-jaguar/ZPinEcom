import * as ExpoLocation from 'expo-location';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { isPuneLocation, isServiceablePincode } from '../constants/delivery';
import { setCatalogPincode } from '../services/api';
import { useAddress } from './AddressContext';
import { useUser } from './UserContext';

/**
 * The customer's catalogue pincode — the ONE source every product listing uses
 * (services/api.ts appends it to every `products*` / `flash-deals` GET).
 *
 * Signed-in customer with a saved address → the default (else first) address.
 * Otherwise → GPS, reverse-geocoded to a postal code. Location permission is
 * asked for at launch; while it is denied/unavailable the root layout shows
 * LocationRequiredScreen over the app.
 */
export type ZoneStatus = 'loading' | 'ready' | 'denied' | 'unavailable';

interface Located {
    status: ZoneStatus;
    pincode: string | null;
    label: string;
    canAskAgain: boolean;
    coords?: { lat: number; lng: number };
}

interface ZoneContextType extends Located {
    source: 'address' | 'gps' | null;
    inZone: boolean;
    retry: () => void;
}

const LOADING: Located = { status: 'loading', pincode: null, label: '', canAskAgain: true };

async function locateByGps(): Promise<Located> {
    try {
        let perm = await ExpoLocation.getForegroundPermissionsAsync();
        if (perm.status !== 'granted' && perm.canAskAgain) {
            perm = await ExpoLocation.requestForegroundPermissionsAsync();
        }
        if (perm.status !== 'granted') return { ...LOADING, status: 'denied', canAskAgain: perm.canAskAgain };
        if (!(await ExpoLocation.hasServicesEnabledAsync())) return { ...LOADING, status: 'unavailable' };

        // Instant cached fix first; a live fix can hang, so it races a timeout.
        const pos = (await ExpoLocation.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }))
            ?? (await Promise.race([
                ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
            ]));
        if (!pos) return { ...LOADING, status: 'unavailable' };

        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const [place] = await ExpoLocation.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
        let pincode = place?.postalCode?.replace(/\D/g, '') || null;
        // ponytail: the geocoder sometimes omits postalCode; a Pune-area fix stands in as 411001
        // (only the zone matters). Muzaffarpur has no city rule, so it needs the real pincode.
        if (!pincode && place && isPuneLocation(place)) pincode = '411001';
        if (!pincode) return { ...LOADING, status: 'unavailable', coords };

        return {
            status: 'ready',
            pincode,
            label: place?.district || place?.subregion || place?.city || pincode,
            canAskAgain: true,
            coords,
        };
    } catch (e) {
        console.warn('locateByGps failed:', e);
        return { ...LOADING, status: 'unavailable' };
    }
}

const ZoneContext = createContext<ZoneContextType | undefined>(undefined);

export const ZoneProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, isLoading: userLoading } = useUser();
    const { addresses, isLoading: addressesLoading } = useAddress();
    const [gps, setGps] = useState<Located>(LOADING);
    const [attempt, setAttempt] = useState(0);
    const retry = () => setAttempt((n) => n + 1);

    // A guest's AddressContext serves a leftover local copy — only a signed-in
    // customer's saved address counts.
    const saved = isAuthenticated ? addresses.find((a) => a.isDefault) || addresses[0] : undefined;
    const waiting = userLoading || (isAuthenticated && addressesLoading);
    const needsGps = !waiting && !saved;

    useEffect(() => {
        if (!needsGps) return;
        let cancelled = false;
        setGps(LOADING);
        locateByGps().then((r) => { if (!cancelled) setGps(r); });
        return () => { cancelled = true; };
    }, [needsGps, attempt]);

    // Coming back from Settings (or after switching GPS on) retries without a tap.
    useEffect(() => {
        if (gps.status !== 'denied' && gps.status !== 'unavailable') return;
        const sub = AppState.addEventListener('change', (s) => { if (s === 'active') retry(); });
        return () => sub.remove();
    }, [gps.status]);

    const located: Located = saved
        ? { status: 'ready', pincode: saved.pincode, label: saved.city || saved.pincode, canAskAgain: true }
        : waiting ? LOADING : gps;
    const value: ZoneContextType = {
        ...located,
        source: saved ? 'address' : waiting ? null : 'gps',
        inZone: isServiceablePincode(located.pincode),
        retry,
    };

    // Set during render, not in an effect: child effects run before this
    // provider's, and the home feed fetches from its very first effect.
    setCatalogPincode(value.status === 'ready' ? value.pincode : null);

    return <ZoneContext.Provider value={value}>{children}</ZoneContext.Provider>;
};

export const useZone = () => {
    const context = useContext(ZoneContext);
    if (!context) throw new Error('useZone must be used within a ZoneProvider');
    return context;
};
