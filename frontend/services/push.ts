import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import apiClient from './api';

/**
 * Device push notifications for the customer app.
 *
 * The in-app notification rows are unchanged — this is the same events (order
 * confirmed, payment successful, out for delivery, delivered) reaching the phone
 * when the app is closed.
 *
 * Ported from the delivery app's `src/services/push.ts`, which has been running
 * this exact flow in production; kept close to it deliberately so the three apps
 * behave the same way.
 *
 * Requires a native build — expo-notifications is not available over OTA, and
 * push tokens need the EAS projectId in app.json.
 */

export const DEFAULT_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let configured = false;

async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    } catch {
      // A missing channel degrades to the system default — not worth failing over.
    }
  }
}

function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined
  );
}

/** The last token we registered — remembered so logout can unregister it. */
let currentToken: string | null = null;

/**
 * Ask for permission, mint the Expo push token, hand it to the backend. Safe to
 * call repeatedly. Returns null (quietly) on a simulator, a denied permission,
 * or a missing projectId — none of those should break signing in.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await configureNotifications();

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const projectId = resolveProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await apiClient.post('auth/push/register', { token, platform: Platform.OS });
    currentToken = token;
    return token;
  } catch {
    // Most commonly: no EAS projectId (Expo Go). Degrade, don't crash.
    return null;
  }
}

/** Logout — stop this device receiving the previous customer's order updates. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!currentToken) return;
  try {
    await apiClient.post('auth/push/unregister', { token: currentToken });
  } catch {
    // Already logged out server-side, or offline. The token is single-owner in
    // `push_tokens`, so the next login on this device re-points it anyway.
  }
  currentToken = null;
}
