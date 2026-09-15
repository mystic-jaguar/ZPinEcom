import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Image, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "../components/common/ErrorBoundary";
import OfflineBanner from "../components/common/OfflineBanner";
import { LocationRequiredScreen } from "../components/common/ZoneScreens";
import { AddressProvider } from "../context/AddressContext";
import { AuthPromptProvider, useRequireAuth } from "../context/AuthPromptContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import { OrderProvider } from "../context/OrderContext";
import { SearchProvider } from "../context/SearchContext";
import { UserProvider, useUser } from "../context/UserContext";
import { NetworkProvider } from "../context/NetworkContext";
import { WishlistProvider } from "../context/WishlistContext";
import { ZoneProvider, useZone } from "../context/ZoneContext";
import { startKeepAlive } from "../services/keepAlive";
import { useNotificationTaps } from "../services/push";
import { installRejectionHandler } from "../utils/rejectionHandler";

installRejectionHandler();

// Route groups a guest may not open (help-center stays public — its chat checks
// auth itself). Everything else — home, categories, search, product, cart — is open.
const GUEST_BLOCKED = ['checkout', 'profile'];

function AnimatedSplash() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={require('../assets/images/app_icon_1024.png')}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useUser();
  const requireAuth = useRequireAuth();
  const zone = useZone();
  const segments = useSegments();
  const router = useRouter();
  const lastHandled = useRef('');

  // Tapping an order push opens that order. Held back until the session is
  // resolved so the auth redirect below doesn't replace() the tap away.
  useNotificationTaps(isAuthenticated && !isLoading);

  useEffect(() => {
    // Start keep-alive only once the user is authenticated
    if (isAuthenticated) startKeepAlive();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    const path = segments.join('/');
    const root = segments[0] as string;
    // Act once per route/auth change — useSegments hands back a new array every render.
    const key = `${isAuthenticated}:${path}`;
    if (lastHandled.current === key) return;
    lastHandled.current = key;
    const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

    if (isAuthenticated && root === 'auth') {
      // Signed in: pop back out of the auth screens (one per change, so
      // login → signup → verify-otp all unwind) to where login was asked for.
      // complete-profile stays reachable for Google users missing DOB/gender.
      if (!path.includes('complete-profile')) leave();
    } else if (!isAuthenticated && GUEST_BLOCKED.includes(root) && !path.includes('help-center')) {
      leave();
      requireAuth('Log in to view your account, orders and addresses.');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return <AnimatedSplash />;
  }

  // Location is compulsory for anyone without a saved address; the gate steps
  // aside on auth/profile routes so "log in" / "add address" stay reachable.
  const root = segments[0] as string;
  const gateLocation = (zone.status === 'denied' || zone.status === 'unavailable') && root !== 'auth' && root !== 'profile';

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/addresses" options={{ title: 'Saved Addresses', headerShown: false }} />
        <Stack.Screen name="profile/add-address" options={{ title: 'Add Address', headerShown: false }} />
        <Stack.Screen name="profile/edit-profile" options={{ title: 'Edit Profile', headerShown: false }} />
        <Stack.Screen name="profile/wishlist" options={{ title: 'Wishlist', headerShown: false }} />
        <Stack.Screen name="product-listing" options={{ headerShown: false }} />
      </Stack>
      {gateLocation && <LocationRequiredScreen />}
    </View>
  );
}

export default function RootLayout() {
  // Fonts are embedded natively via the expo-font config plugin (see app.json),
  // so they are registered by family name at startup — no runtime useFonts()
  // asset resolution, which used to hang the splash under expo-updates/OTA.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <NetworkProvider>
          <SearchProvider>
            <UserProvider>
              {/* Reads isAuthenticated, so it sits inside UserProvider. */}
              <NotificationsProvider>
              {/* Wishlist wraps Cart: adding to the cart removes the item from the
                  wishlist, so the cart needs to read the wishlist, not the reverse. */}
              <WishlistProvider>
                <CartProvider>
                  <CheckoutProvider>
                    <AddressProvider>
                      {/* Reads the saved addresses, so it sits inside AddressProvider. */}
                      <ZoneProvider>
                        <OrderProvider>
                          <AuthPromptProvider>
                            <RootLayoutNav />
                          </AuthPromptProvider>
                        </OrderProvider>
                      </ZoneProvider>
                    </AddressProvider>
                  </CheckoutProvider>
                </CartProvider>
              </WishlistProvider>
              </NotificationsProvider>
            </UserProvider>
          </SearchProvider>
          <OfflineBanner />
          </NetworkProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
