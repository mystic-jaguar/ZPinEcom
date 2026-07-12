import { LinearGradient } from 'expo-linear-gradient';
import { Bike, Home, Store } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, palette } from '../../constants/theme';

export type RoutePhase = 'confirmed' | 'shipped' | 'delivered';

const DASH_W = 7;
const DASH_GAP = 6;
const DASH_PERIOD = DASH_W + DASH_GAP; // 13
const DASH_COUNT = 44; // ~570px, wider than any segment

// A horizontally marching dashed line. Always animates so the route reads as "live".
function DashLine({ color }: { color: string }) {
    const tx = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(tx, {
                toValue: -DASH_PERIOD,
                duration: 480,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [tx]);
    return (
        <Animated.View style={[styles.dashRow, { transform: [{ translateX: tx }] }]}>
            {Array.from({ length: DASH_COUNT }).map((_, i) => (
                <View key={i} style={[styles.dash, { backgroundColor: color }]} />
            ))}
        </Animated.View>
    );
}

// One segment: dim marching dashes underneath, yellow marching dashes revealed by an
// animated fill that grows to full when the courier "reaches" the next node.
function Segment({ filled }: { filled: boolean }) {
    const [w, setW] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(progress, {
            toValue: filled ? 1 : 0,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [filled, progress]);
    const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, w] });
    return (
        <View style={styles.segment} onLayout={e => setW(e.nativeEvent.layout.width)}>
            <DashLine color="rgba(255,255,255,0.22)" />
            <Animated.View style={[styles.fill, { width: fillWidth }]}>
                {w > 0 && (
                    <View style={{ width: w }}>
                        <DashLine color={palette.yellow500} />
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

// Bright yellow surge sweeping across the whole route — the "electricity" celebration.
function ElectricSweep() {
    const tx = useRef(new Animated.Value(0)).current;
    const [w, setW] = useState(0);
    useEffect(() => {
        if (w === 0) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(tx, {
                    toValue: 1,
                    duration: 1100,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.delay(600),
                Animated.timing(tx, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [tx, w]);
    const translateX = tx.interpolate({ inputRange: [0, 1], outputRange: [-90, w] });
    return (
        <View style={styles.sweepClip} pointerEvents="none" onLayout={e => setW(e.nativeEvent.layout.width)}>
            <Animated.View style={[styles.sweep, { transform: [{ translateX }] }]}>
                <LinearGradient
                    colors={['rgba(255,196,0,0)', 'rgba(255,221,77,0.95)', 'rgba(255,255,255,0.9)', 'rgba(255,221,77,0.95)', 'rgba(255,196,0,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.sweepGradient}
                />
            </Animated.View>
        </View>
    );
}

export default function RouteTrack({ phase, electric }: { phase: RoutePhase; electric: boolean }) {
    const reachedBike = phase === 'shipped' || phase === 'delivered';
    const reachedHome = phase === 'delivered';
    return (
        <View style={styles.route}>
            <View style={styles.nodeSmall}><Store size={14} color={colors.textOnYellow} /></View>
            <Segment filled={reachedBike} />
            <View style={[styles.nodeBig, reachedBike && styles.nodeBigOn]}>
                <Bike size={18} color={colors.textStrong} />
            </View>
            <Segment filled={reachedHome} />
            <View style={[styles.nodeDim, reachedHome && styles.nodeHomeOn]}>
                <Home size={14} color={reachedHome ? colors.textOnYellow : '#fff'} />
            </View>
            {electric && <ElectricSweep />}
        </View>
    );
}

const styles = StyleSheet.create({
    route: { flexDirection: 'row', alignItems: 'center' },
    nodeSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    nodeBig: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    nodeBigOn: { borderColor: palette.yellow500 },
    nodeDim: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    nodeHomeOn: { backgroundColor: palette.yellow500 },

    segment: { flex: 1, height: 3, justifyContent: 'center', overflow: 'hidden' },
    fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', justifyContent: 'center' },
    dashRow: { flexDirection: 'row', height: 3 },
    dash: { width: DASH_W, height: 3, borderRadius: 2, marginRight: DASH_GAP },

    sweepClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 4 },
    sweep: { position: 'absolute', top: -8, bottom: -8, width: 90 },
    sweepGradient: { flex: 1, borderRadius: 8 },
});
