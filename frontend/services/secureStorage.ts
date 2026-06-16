import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure storage for sensitive auth tokens.
 *
 * iOS  -> Keychain, Android -> Keystore-backed encrypted store (via expo-secure-store).
 * Web  -> SecureStore is unavailable, so we fall back to AsyncStorage.
 *
 * SecureStore keys may only contain alphanumerics, ".", "-" and "_" — so these
 * keys deliberately drop the "@" prefix used by the old AsyncStorage keys.
 */
export const SECURE_KEYS = {
    ACCESS_TOKEN: 'zpin_access_token',
    REFRESH_TOKEN: 'zpin_refresh_token',
} as const;

// Legacy AsyncStorage keys (unencrypted) — migrated to SecureStore on first access.
const LEGACY_KEYS = {
    ACCESS_TOKEN: '@zpin_access_token',
    REFRESH_TOKEN: '@zpin_refresh_token',
} as const;

const isWeb = Platform.OS === 'web';

export async function secureGet(key: string): Promise<string | null> {
    if (isWeb) {
        return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
}

export async function secureSet(key: string, value: string): Promise<void> {
    if (isWeb) {
        await AsyncStorage.setItem(key, value);
        return;
    }
    await SecureStore.setItemAsync(key, value);
}

export async function secureRemove(key: string): Promise<void> {
    if (isWeb) {
        await AsyncStorage.removeItem(key);
        return;
    }
    await SecureStore.deleteItemAsync(key);
}

/**
 * One-time migration of tokens written by older app versions into AsyncStorage.
 * Moves any legacy tokens into SecureStore and deletes the plaintext copies.
 * Memoized so it runs at most once per app session.
 */
let migrationPromise: Promise<void> | null = null;

export function ensureTokensMigrated(): Promise<void> {
    if (!migrationPromise) {
        migrationPromise = migrateTokens().catch((err) => {
            // Don't let a migration failure wedge auth — reset so a later call can retry.
            migrationPromise = null;
            if (__DEV__) {
                console.warn('[secureStorage] token migration failed', err);
            }
        });
    }
    return migrationPromise;
}

async function migrateTokens(): Promise<void> {
    const pairs: [legacy: string, secure: string][] = [
        [LEGACY_KEYS.ACCESS_TOKEN, SECURE_KEYS.ACCESS_TOKEN],
        [LEGACY_KEYS.REFRESH_TOKEN, SECURE_KEYS.REFRESH_TOKEN],
    ];

    for (const [legacyKey, secureKey] of pairs) {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue && legacyValue !== 'null' && legacyValue !== 'undefined') {
            // Only seed SecureStore if it doesn't already hold a (newer) value.
            const existing = await secureGet(secureKey);
            if (!existing) {
                await secureSet(secureKey, legacyValue);
            }
        }
        // Always clear the plaintext copy, even if empty/invalid.
        await AsyncStorage.removeItem(legacyKey);
    }
}
