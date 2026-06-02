import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Image, View } from "react-native";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { AddressProvider } from "../context/AddressContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { SearchProvider } from "../context/SearchContext";
import { UserProvider, useUser } from "../context/UserContext";
import { WishlistProvider } from "../context/WishlistContext";
import { startKeepAlive } from "../services/keepAlive";

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
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Start keep-alive only once the user is authenticated
    if (isAuthenticated) startKeepAlive();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)' || (segments[0] as string) === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Allow the complete-profile screen to remain accessible for
      // authenticated users who need to fill in missing DOB/gender
      // after Google Sign-In.
      const onCompleteProfile = segments.join('/').includes('complete-profile');
      if (!onCompleteProfile) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return <AnimatedSplash />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile/addresses" options={{ title: 'Saved Addresses', headerShown: false }} />
      <Stack.Screen name="profile/add-address" options={{ title: 'Add Address', headerShown: false }} />
      <Stack.Screen name="profile/edit-profile" options={{ title: 'Edit Profile', headerShown: false }} />
      <Stack.Screen name="profile/wishlist" options={{ title: 'Wishlist', headerShown: false }} />
      <Stack.Screen name="product-listing" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SearchProvider>
        <UserProvider>
          <CartProvider>
            <WishlistProvider>
              <CheckoutProvider>
                <AddressProvider>
                  <OrderProvider>
                    <RootLayoutNav />
                  </OrderProvider>
                </AddressProvider>
              </CheckoutProvider>
            </WishlistProvider>
          </CartProvider>
        </UserProvider>
      </SearchProvider>
    </ErrorBoundary>
  );
}
