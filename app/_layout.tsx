import { Stack } from "expo-router";
import { AddressProvider } from "../context/AddressContext";
import { CartProvider } from "../context/CartContext";

export default function RootLayout() {
  return (
    <CartProvider>
      <AddressProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product-listing" options={{ headerShown: false }} />
          <Stack.Screen name="profile/addresses" options={{ title: 'Saved Addresses', headerShown: false }} />
          <Stack.Screen name="profile/add-address" options={{ title: 'Add Address', headerShown: false }} />
        </Stack>
      </AddressProvider>
    </CartProvider>
  );
}
