import { authService } from '@/services/auth';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Root index - Redirect to login or home based on auth status
 */
export default function Index() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
    };

    if (isAuthenticated === null) {
        // Still checking auth status
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FFC107" />
            </View>
        );
    }

    // Redirect based on auth status
    return <Redirect href={isAuthenticated ? '/(tabs)' : '/auth/login'} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
});
