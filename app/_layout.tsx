import { Stack } from "expo-router";
import { AddressProvider } from "../context/AddressContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { WishlistProvider } from "../context/WishlistContext";

export default function RootLayout() {
  return (
    <CartProvider>
      <WishlistProvider>
        <CheckoutProvider>
          <AddressProvider>
            <OrderProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="product-listing" options={{ headerShown: false }} />
                <Stack.Screen name="profile/addresses" options={{ title: 'Saved Addresses', headerShown: false }} />
                <Stack.Screen name="profile/add-address" options={{ title: 'Add Address', headerShown: false }} />
                <Stack.Screen name="profile/wishlist" options={{ title: 'Wishlist', headerShown: false }} />
              </Stack>
            </OrderProvider>
          </AddressProvider>
        </CheckoutProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
