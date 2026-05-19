import { authService } from '@/services/auth';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

/**
 * Root index - Animated splash then redirect based on auth status
 */
export default function Index() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [showSplash, setShowSplash] = useState(true);

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkAuth();
        runAnimation();
    }, []);

    const runAnimation = () => {
        // Entry: fade + scale in
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
            Animated.timing(glowAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Pulse loop after entry
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
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

        // Hide splash after 2.2s
        setTimeout(() => setShowSplash(false), 2200);
    };

    const checkAuth = async () => {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
    };

    if (showSplash || isAuthenticated === null) {
        return (
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            opacity: opacityAnim,
                            transform: [
                                { scale: Animated.multiply(scaleAnim, pulseAnim) },
                            ],
                        },
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.glow,
                            { opacity: glowAnim },
                        ]}
                    />
                    <Image
                        source={require('../assets/images/icon_backup.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>
            </View>
        );
    }

    return <Redirect href={isAuthenticated ? '/(tabs)' : '/auth/login'} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#FFC800',
        opacity: 0.15,
    },
    logo: {
        width: 200,
        height: 200,
    },
});
