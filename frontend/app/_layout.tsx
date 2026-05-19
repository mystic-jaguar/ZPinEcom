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
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // circle starts small, expands to cover full screen
  const circleScale = useRef(new Animated.Value(0.1)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: logo fades/springs in, circle grows to glow size
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: logo pulses while circle expands to fill screen
      Animated.parallel([
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
        ),
        Animated.timing(circleScale, {
          toValue: 8,
          duration: 1200,
          delay: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      {/* Expanding yellow circle */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: '#FFC800',
          opacity: circleOpacity,
          transform: [{ scale: circleScale }],
        }}
      />
      {/* Logo on top */}
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: logoOpacity,
          transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
        }}
      >
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
