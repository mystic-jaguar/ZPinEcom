import { Bike, Home, Store } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

// Crackling lightning arcing through the whole route — the instant-trial "electricity".
const BOLT_H = 46;

function makeBolt(w: number) {
    const cy = BOLT_H / 2;
    const seg = Math.max(6, Math.round(w / 24));
    const pts: [number, number][] = [];
    for (let i = 0; i <= seg; i++) {
        const x = (w * i) / seg;
        const y = i === 0 || i === seg ? cy : cy + (Math.random() * 2 - 1) * 9.5;
        pts.push([x, y]);
    }
    const main = 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
    const branches: string[] = [];
    const nb = 1 + Math.floor(Math.random() * 2);
    for (let b = 0; b < nb; b++) {
        const [bx, by] = pts[1 + Math.floor(Math.random() * (seg - 1))];
        const ex = bx + (Math.random() * 2 - 1) * 15;
        const ey = by + (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 8);
        const mx = (bx + ex) / 2 + (Math.random() * 2 - 1) * 5;
        const my = (by + ey) / 2 + (Math.random() * 2 - 1) * 5;
        branches.push(`M${bx.toFixed(1)},${by.toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`);
    }
    return { main, branches, op: 0.6 + Math.random() * 0.4 };
}

function Electric() {
    const [w, setW] = useState(0);
    const [bolt, setBolt] = useState(() => makeBolt(1));
    useEffect(() => {
        if (w === 0) return;
        setBolt(makeBolt(w));
        const id = setInterval(() => setBolt(makeBolt(w)), 85); // rapid re-strike = crackle
        return () => clearInterval(id);
    }, [w]);
    return (
        <View style={styles.electricClip} pointerEvents="none" onLayout={e => setW(e.nativeEvent.layout.width)}>
            {w > 0 && (
                <Svg width={w} height={BOLT_H} style={styles.bolt}>
                    <Path d={bolt.main} stroke="rgba(255,196,0,0.45)" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={bolt.op} />
                    <Path d={bolt.main} stroke="#FFF6C8" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={bolt.op} />
                    {bolt.branches.map((d, i) => (
                        <Path key={i} d={d} stroke="rgba(255,221,77,0.9)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={bolt.op * 0.85} />
                    ))}
                </Svg>
            )}
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
            {electric && <Electric />}
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

    electricClip: { ...StyleSheet.absoluteFillObject, alignItems: 'stretch', justifyContent: 'center' },
    bolt: { position: 'absolute', top: -6 },
});
