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
function Segment({ filled, hidden }: { filled: boolean; hidden?: boolean }) {
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
    // When lightning is active the dashes are hidden — only the bolt runs the route.
    if (hidden) return <View style={styles.segment} />;
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
// Real lightning is fractal: the channel is built by midpoint displacement (big kinks
// with progressively finer jitter), branches fork off it and taper, and each strike
// flashes then flickers along the SAME channel before a dark gap and a re-strike.
const BOLT_H = 46;
const Y_MIN = 4;
const Y_MAX = BOLT_H - 4;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clampY = (y: number) => Math.min(Y_MAX, Math.max(Y_MIN, y));

// Midpoint-displacement: repeatedly split each segment, kicking the midpoint sideways
// by a shrinking offset. Gives jaggedness at every scale instead of a uniform zigzag.
function fracture(a: [number, number], b: [number, number], offset: number, passes: number): [number, number][] {
    let pts: [number, number][] = [a, b];
    for (let p = 0; p < passes; p++) {
        const next: [number, number][] = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const [ax, ay] = pts[i - 1];
            const [bx, by] = pts[i];
            next.push([(ax + bx) / 2 + rand(-offset, offset) * 0.35, clampY((ay + by) / 2 + rand(-offset, offset))], pts[i]);
        }
        pts = next;
        offset *= 0.55;
    }
    return pts;
}

const toPath = (pts: [number, number][]) => 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');

type BoltBranch = { d: string; depth: number };

function makeBolt(w: number) {
    const cy = BOLT_H / 2;
    // Main channel: pinned to the nodes at both ends, fractal in between.
    const main = fracture([0, cy], [w, cy], 10, 4);
    const branches: BoltBranch[] = [];

    // Forks: leave the channel at a shallow angle (like real leaders), taper, and can
    // themselves fork once more.
    const grow = (from: [number, number], len: number, dirY: number, depth: number) => {
        const ex = from[0] + len * rand(0.75, 1.15);
        const ey = clampY(from[1] + dirY * len * rand(0.35, 0.7));
        const pts = fracture(from, [ex, ey], len * 0.28, 3);
        branches.push({ d: toPath(pts), depth });
        if (depth < 2 && Math.random() < 0.45) {
            const mid = pts[Math.floor(pts.length * rand(0.4, 0.8))];
            grow(mid, len * 0.5, -dirY, depth + 1);
        }
    };
    const nForks = 2 + Math.floor(Math.random() * 2);
    for (let f = 0; f < nForks; f++) {
        const at = main[Math.floor(main.length * rand(0.15, 0.85))];
        grow(at, rand(18, 34), Math.random() < 0.5 ? -1 : 1, 1);
    }
    return { main: toPath(main), branches };
}

type Bolt = ReturnType<typeof makeBolt>;

function Electric() {
    const [w, setW] = useState(0);
    const [bolt, setBolt] = useState<Bolt | null>(null);
    const [flash, setFlash] = useState(1);
    // The strike is DISCHARGED left→right in two hops: it lands on the bike (mid-route)
    // first, holds for a beat, then jumps on to the door — the courier reaching you, then
    // reaching home. The bike sits at the horizontal centre, so 0.5 = the bike node.
    const reveal = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (w === 0) return;
        let alive = true;
        let t: ReturnType<typeof setTimeout>;
        const strike = () => {
            if (!alive) return;
            setBolt(makeBolt(w)); // new channel
            setFlash(1);
            reveal.setValue(0);
            Animated.sequence([
                // Hop 1: store → bike, easing out so it "lands" on the courier.
                Animated.timing(reveal, { toValue: 0.5, duration: rand(560, 700), easing: Easing.out(Easing.quad), useNativeDriver: false }),
                Animated.delay(rand(180, 280)), // held on the bike — the hit
                // Hop 2: bike → home.
                Animated.timing(reveal, { toValue: 1, duration: rand(560, 700), easing: Easing.out(Easing.quad), useNativeDriver: false }),
            ]).start(({ finished }) => {
                if (!alive || !finished) return;
                // Once it has arrived, the full channel flickers and decays, then a dark gap.
                const flickers = 2 + Math.floor(Math.random() * 3);
                let i = 0;
                const tick = () => {
                    if (!alive) return;
                    if (i < flickers) {
                        setFlash(rand(0.3, 0.85) * (1 - i / (flickers + 2)) + 0.15);
                        i++;
                        t = setTimeout(tick, rand(40, 95));
                    } else {
                        setBolt(null); // dark gap before the next strike re-fires from the left
                        t = setTimeout(strike, rand(90, 260));
                    }
                };
                tick();
            });
        };
        strike();
        return () => { alive = false; clearTimeout(t); reveal.stopAnimation(); };
    }, [w, reveal]);

    const revealW = reveal.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(w, 1)] });

    return (
        <View style={styles.electricClip} pointerEvents="none" onLayout={e => setW(e.nativeEvent.layout.width)}>
            {w > 0 && bolt && (
                // Clip the fixed-width bolt to the advancing reveal window so it draws itself
                // from the store toward the door.
                <Animated.View style={[styles.boltClip, { width: revealW }]}>
                    <Svg width={w} height={BOLT_H}>
                    {/* wide soft yellow corona → tighter glow → white-hot core */}
                    <Path d={bolt.main} stroke="rgba(255,196,0,0.18)" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash} />
                    <Path d={bolt.main} stroke="rgba(255,208,45,0.55)" strokeWidth={4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash} />
                    <Path d={bolt.main} stroke="#FFFBEA" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash} />
                    {bolt.branches.map((b, i) => (
                        <React.Fragment key={i}>
                            <Path d={b.d} stroke="rgba(255,205,40,0.4)" strokeWidth={b.depth === 1 ? 2.8 : 1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash * 0.9} />
                            <Path d={b.d} stroke="rgba(255,244,200,0.95)" strokeWidth={b.depth === 1 ? 1.1 : 0.7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash * (b.depth === 1 ? 0.9 : 0.6)} />
                        </React.Fragment>
                    ))}
                    </Svg>
                </Animated.View>
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
            <Segment filled={reachedBike} hidden={electric} />
            <View style={[styles.nodeBig, reachedBike && styles.nodeBigOn]}>
                <Bike size={18} color={colors.textStrong} />
            </View>
            <Segment filled={reachedHome} hidden={electric} />
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
    boltClip: { position: 'absolute', top: -6, left: 0, height: BOLT_H, overflow: 'hidden' },
});
