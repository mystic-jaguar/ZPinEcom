import { Bike, Home, Store } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { createStyles, colors, palette } from '../../constants/theme';

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

type Lightning = { channel: string; branches: string[]; thick: number };

// One complete, self-contained lightning: its own fractal channel pinned to both nodes,
// its own thickness, and its own forks peeling off it.
function makeLightning(w: number, lane: number, solo: boolean): Lightning {
    const cy = BOLT_H / 2;
    // Each lightning lives in its own vertical lane so simultaneous strikes read as
    // separate bolts instead of one fuzzy channel; ends stay pinned to the icons.
    const midX = w * rand(0.35, 0.65);
    const midY = clampY(cy + lane + rand(-3, 3));
    const pts = fracture([0, cy], [midX, midY], rand(8, 12), 5)
        .concat(fracture([midX, midY], [w, cy], rand(8, 12), 5).slice(1));

    // Forks: mostly one, sometimes two splitting opposite ways. They travel FORWARD along
    // the strike and die out — never re-forking back (that recursion reads as a tree).
    const branches: string[] = [];
    const heads = Math.random() < 0.4 ? 2 : 1;
    let dir = Math.random() < 0.5 ? -1 : 1;
    for (let f = 0; f < heads; f++) {
        // Split point wanders the whole route — right off the store, mid-way, just after
        // the bike, or a breath before the door.
        const from = pts[Math.floor(pts.length * rand(0.06, 0.92))];
        const len = rand(12, 22);
        const end: [number, number] = [
            from[0] + len * rand(0.7, 1.1),                 // continue forward, not straight down
            clampY(from[1] + dir * len * rand(0.5, 0.95)),  // veer to one side
        ];
        branches.push(toPath(fracture(from, end, len * 0.3, 3)));
        dir = -dir; // a second head veers the other way
    }
    // A lone strike can run fat or wiry; companions fire thinner so each stays distinct.
    const thick = solo ? rand(0.7, 1.12) : rand(0.45, 0.75);
    return { channel: toPath(pts), branches, thick };
}

function makeBolt(w: number) {
    // How many lightnings hit at once: usually one, sometimes 2 or 3 striking together.
    const count = Math.random() < 0.55 ? 1 : Math.random() < 0.65 ? 2 : 3;
    // Spread the lanes so 2–3 bolts fan apart: one high, one low, one centre.
    const lanes = count === 1 ? [0] : count === 2 ? [-9, 9] : [-13, 0, 13];
    return { lightnings: lanes.map(lane => makeLightning(w, lane, count === 1)) };
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
                Animated.timing(reveal, { toValue: 0.5, duration: rand(440, 560), easing: Easing.out(Easing.quad), useNativeDriver: false }),
                Animated.delay(rand(130, 200)), // held on the bike — the hit
                // Hop 2: bike → home.
                Animated.timing(reveal, { toValue: 1, duration: rand(440, 560), easing: Easing.out(Easing.quad), useNativeDriver: false }),
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
                    {/* each lightning: wide soft yellow corona → tighter glow → white-hot core,
                        plus its own forks */}
                    {bolt.lightnings.map((L, i) => (
                        <React.Fragment key={i}>
                            <Path d={L.channel} stroke="rgba(255,196,0,0.18)" strokeWidth={10 * L.thick} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash} />
                            <Path d={L.channel} stroke="rgba(255,208,45,0.55)" strokeWidth={4.2 * L.thick} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash} />
                            <Path d={L.channel} stroke="#FFFBEA" strokeWidth={1.6 * L.thick} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash} />
                            {L.branches.map((d, j) => (
                                <React.Fragment key={j}>
                                    <Path d={d} stroke="rgba(255,205,40,0.35)" strokeWidth={1.8 * L.thick} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash * 0.7} />
                                    <Path d={d} stroke="rgba(255,244,200,0.9)" strokeWidth={0.8 * L.thick} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flash * 0.55} />
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                    </Svg>
                </Animated.View>
            )}
        </View>
    );
}

// `reverse` flips the endpoints for a return: the parcel starts at the customer's
// door and travels back to the seller's store.
export default function RouteTrack({ phase, electric, reverse }: { phase: RoutePhase; electric: boolean; reverse?: boolean }) {
    const reachedBike = phase === 'shipped' || phase === 'delivered';
    const reachedHome = phase === 'delivered';
    const Start = reverse ? Home : Store;
    const End = reverse ? Store : Home;
    return (
        <View style={styles.route}>
            <View style={styles.nodeSmall}><Start size={14} color={colors.textOnYellow} /></View>
            <Segment filled={reachedBike} hidden={electric} />
            <View style={[styles.nodeBig, reachedBike && styles.nodeBigOn]}>
                <Bike size={18} color={colors.textStrong} />
            </View>
            <Segment filled={reachedHome} hidden={electric} />
            <View style={[styles.nodeDim, reachedHome && styles.nodeHomeOn]}>
                <End size={14} color={reachedHome ? colors.textOnYellow : '#fff'} />
            </View>
            {electric && <Electric />}
        </View>
    );
}

const styles = createStyles({
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
