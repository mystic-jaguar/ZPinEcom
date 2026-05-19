import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, View } from "react-native";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { AddressProvider } from "../context/AddressContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { SearchProvider } from "../context/SearchContext";
import { UserProvider, useUser } from "../context/UserContext";
import { WishlistProvider } from "../context/WishlistContext";
import { startKeepAlive } from "../services/keepAlive";

// Start keep-alive immediately when the app loads
startKeepAlive();

function AnimatedSplash() {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.2,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: opacityAnim,
          transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: '#FFC800',
            opacity: glowOpacity,
          }}
        />
        <Image
          source={require('../assets/images/icon_backup.png')}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)' || (segments[0] as string) === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
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
