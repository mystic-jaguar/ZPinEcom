import { Stack } from "expo-router";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { AddressProvider } from "../context/AddressContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { PaymentProvider } from '../context/PaymentContext';
import { SearchProvider } from "../context/SearchContext";
import { UserProvider } from "../context/UserContext";
import { WishlistProvider } from "../context/WishlistContext";

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
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="auth" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="product-listing" options={{ headerShown: false }} />
                        <Stack.Screen name="profile/addresses" options={{ title: 'Saved Addresses', headerShown: false }} />
                        <Stack.Screen name="profile/add-address" options={{ title: 'Add Address', headerShown: false }} />
                        <Stack.Screen name="profile/edit-profile" options={{ title: 'Edit Profile', headerShown: false }} />
                        <Stack.Screen name="profile/wishlist" options={{ title: 'Wishlist', headerShown: false }} />
                        <Stack.Screen name="profile/payment-methods" options={{ headerShown: false }} />
                        <Stack.Screen name="profile/add-payment-method" options={{ headerShown: false }} />
                      </Stack>
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
