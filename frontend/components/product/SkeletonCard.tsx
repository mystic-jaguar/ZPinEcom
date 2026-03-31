import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const CARD_WIDTH = (Dimensions.get('window').width / 2) - 20;

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
        <Animated.View style={[styles.card, { opacity }]}>
            <View style={styles.image} />
            <View style={styles.line1} />
            <View style={styles.line2} />
            <View style={styles.line3} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        marginBottom: 20,
    },
    image: {
        height: CARD_WIDTH * 1.3,
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
