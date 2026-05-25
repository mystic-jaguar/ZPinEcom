import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="complete-profile" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-reset-otp" />
            <Stack.Screen name="reset-password" />
        </Stack>
    );
}
