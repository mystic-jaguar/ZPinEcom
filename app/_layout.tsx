import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { AddressProvider } from "../context/AddressContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { PaymentProvider } from '../context/PaymentContext';
import { SearchProvider } from "../context/SearchContext";
import { UserProvider, useUser } from "../context/UserContext";
import { WishlistProvider } from "../context/WishlistContext";

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)' || (segments[0] as string) === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile/addresses" options={{ title: 'Saved Addresses', headerShown: false }} />
      <Stack.Screen name="profile/add-address" options={{ title: 'Add Address', headerShown: false }} />
      <Stack.Screen name="profile/edit-profile" options={{ title: 'Edit Profile', headerShown: false }} />
      <Stack.Screen name="profile/wishlist" options={{ title: 'Wishlist', headerShown: false }} />
      <Stack.Screen name="profile/payment-methods" options={{ headerShown: false }} />
      <Stack.Screen name="profile/add-payment-method" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SearchProvider>
        <CartProvider>
          <WishlistProvider>
            <CheckoutProvider>
              <UserProvider>
                <PaymentProvider>
                  <AddressProvider>
                    <OrderProvider>
                      <RootLayoutNav />
                    </OrderProvider>
                  </AddressProvider>
                </PaymentProvider>
              </UserProvider>
            </CheckoutProvider>
          </WishlistProvider>
        </CartProvider>
      </SearchProvider>
    </ErrorBoundary>
  );
}
