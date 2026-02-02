import { Stack } from 'expo-router';
import React from 'react';
import { CheckoutProvider } from '../../context/CheckoutContext';

export default function CheckoutLayout() {
    return (
        <CheckoutProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="address" options={{ title: 'Shipping Address' }} />
                <Stack.Screen name="payment" options={{ title: 'Payment Method' }} />
                <Stack.Screen name="summary" options={{ title: 'Checkout Summary' }} />
            </Stack>
        </CheckoutProvider>
    );
}
