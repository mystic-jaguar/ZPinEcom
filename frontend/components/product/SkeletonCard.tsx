import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { createStyles, productGridCardWidth } from '../../constants/theme';

// Must equal the real ProductCard width, or the grid jumps when data arrives.
// Applied inline below rather than in the sheet: it is already device-derived,
// and createStyles would scale it a second time.
const CARD_WIDTH = productGridCardWidth;

export default function SkeletonCard() {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

    return (
        <Animated.View style={[styles.card, { width: CARD_WIDTH, opacity }]}>
            <View style={[styles.image, { height: Math.round(CARD_WIDTH * 1.3) }]} />
            <View style={styles.line1} />
            <View style={styles.line2} />
            <View style={styles.line3} />
        </Animated.View>
    );
}

const styles = createStyles({
    card: {
        marginBottom: 20,
    },
    image: {
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        marginBottom: 10,
    },
    line1: {
        height: 10,
        width: '60%',
        borderRadius: 5,
        backgroundColor: '#E5E7EB',
        marginBottom: 6,
    },
    line2: {
        height: 12,
        width: '85%',
        borderRadius: 5,
        backgroundColor: '#E5E7EB',
        marginBottom: 6,
    },
    line3: {
        height: 10,
        width: '40%',
        borderRadius: 5,
        backgroundColor: '#E5E7EB',
    },
});
