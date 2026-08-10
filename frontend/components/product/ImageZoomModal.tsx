import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;
const TAP_MOVE_THRESHOLD = 10;
const TAP_MAX_DURATION_MS = 250;
const EDGE_SWITCH_THRESHOLD = 60;
const SWIPE_THRESHOLD = 60;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen pinch-to-zoom viewer for a product's image gallery.
 *
 * Built on RN's own Animated + PanResponder rather than gesture-handler /
 * reanimated: both are installed (transitively, via expo-router) but nothing in
 * this app has ever rendered them, so using them here would mean a new native
 * surface plus a GestureHandlerRootView the app doesn't have — for a viewer
 * that core RN handles in one file.
 *
 * Zooming lives in a modal, not inline in the carousel, so a pinch can never
 * fight the horizontal pager for the same touch.
 */
export default function ImageZoomModal({
    visible,
    images,
    initialIndex,
    onClose,
    onIndexChange,
}: {
    visible: boolean;
    images: any[];
    initialIndex: number;
    onClose: () => void;
    onIndexChange?: (index: number) => void;
}) {
    const [index, setIndex] = useState(initialIndex);
    // PanResponder.create runs once (useRef keeps only the first render's
    // closure), so its handlers can never see fresh `index` state — mirror it
    // into a ref they can read live instead.
    const indexRef = useRef(initialIndex);
    const scale = useRef(new Animated.Value(1)).current;
    const tx = useRef(new Animated.Value(0)).current;
    const ty = useRef(new Animated.Value(0)).current;

    // Animated.Value has no public synchronous getter, so mirror the live values
    // into refs — the pan handlers need them mid-gesture.
    const live = useRef({ scale: 1, x: 0, y: 0 });
    // Where the current gesture started from.
    const start = useRef({ scale: 1, x: 0, y: 0, dist: 0, time: 0, multiTouch: false });
    const lastTap = useRef(0);

    useEffect(() => {
        const s = scale.addListener(({ value }) => { live.current.scale = value; });
        const x = tx.addListener(({ value }) => { live.current.x = value; });
        const y = ty.addListener(({ value }) => { live.current.y = value; });
        return () => { scale.removeListener(s); tx.removeListener(x); ty.removeListener(y); };
    }, [scale, tx, ty]);

    const reset = (animated = true) => {
        const to = [
            Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.timing(tx, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
        ];
        if (animated) Animated.parallel(to).start();
        else { scale.setValue(1); tx.setValue(0); ty.setValue(0); }
    };

    // Reopening (or switching photos) must not inherit the previous zoom.
    useEffect(() => { if (visible) { setIndex(initialIndex); indexRef.current = initialIndex; reset(false); } }, [visible, initialIndex]);

    const goTo = (next: number) => {
        const clamped = clamp(next, 0, images.length - 1);
        if (clamped === indexRef.current) { clampPan(); return; }
        indexRef.current = clamped;
        setIndex(clamped);
        onIndexChange?.(clamped);
        reset(false);
    };

    // Keep the image from being dragged entirely off-screen: at scale s only
    // (s-1)/2 of each edge can be hidden.
    const bounds = (s: number) => ({
        maxX: (SCREEN_W * (s - 1)) / 2,
        maxY: (SCREEN_H * (s - 1)) / 2,
    });

    const clampPan = () => {
        const { maxX, maxY } = bounds(live.current.scale);
        const x = clamp(live.current.x, -maxX, maxX);
        const y = clamp(live.current.y, -maxY, maxY);
        if (x !== live.current.x) Animated.spring(tx, { toValue: x, useNativeDriver: true }).start();
        if (y !== live.current.y) Animated.spring(ty, { toValue: y, useNativeDriver: true }).start();
    };

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                start.current = {
                    scale: live.current.scale, x: live.current.x, y: live.current.y,
                    dist: 0, time: Date.now(), multiTouch: e.nativeEvent.touches.length >= 2,
                };
            },
            onPanResponderMove: (e, gesture) => {
                const touches = e.nativeEvent.touches;
                if (touches.length >= 2) {
                    start.current.multiTouch = true;
                    const dx = touches[0].pageX - touches[1].pageX;
                    const dy = touches[0].pageY - touches[1].pageY;
                    const dist = Math.hypot(dx, dy);
                    if (!start.current.dist) { start.current.dist = dist; return; }
                    scale.setValue(clamp(start.current.scale * (dist / start.current.dist), MIN_SCALE, MAX_SCALE));
                } else if (live.current.scale > 1) {
                    // Follow the finger, but clamped live so the image can never be
                    // dragged fully off-screen mid-gesture (previously this only
                    // snapped back after the finger lifted).
                    const { maxX, maxY } = bounds(live.current.scale);
                    tx.setValue(clamp(start.current.x + gesture.dx, -maxX, maxX));
                    ty.setValue(clamp(start.current.y + gesture.dy, -maxY, maxY));
                }
            },
            onPanResponderRelease: (e, gesture) => {
                if (start.current.multiTouch) {
                    if (live.current.scale <= 1.01) reset(); else clampPan();
                    return;
                }

                const moved = Math.hypot(gesture.dx, gesture.dy);
                const isTap = moved < TAP_MOVE_THRESHOLD && (Date.now() - start.current.time) < TAP_MAX_DURATION_MS;

                if (isTap) {
                    const now = Date.now();
                    if (now - lastTap.current < DOUBLE_TAP_MS) {
                        lastTap.current = 0;
                        if (live.current.scale > 1) reset();
                        else Animated.timing(scale, { toValue: 2, duration: 180, useNativeDriver: true }).start();
                    } else {
                        lastTap.current = now;
                    }
                    return;
                }

                if (start.current.scale > 1) {
                    // Zoomed: only switch photos once the drag has pushed past the
                    // pan boundary (i.e. there's nowhere left to pan to).
                    const { maxX } = bounds(start.current.scale);
                    const attemptedX = start.current.x + gesture.dx;
                    if (attemptedX - maxX > EDGE_SWITCH_THRESHOLD) { goTo(indexRef.current - 1); return; }
                    if (-maxX - attemptedX > EDGE_SWITCH_THRESHOLD) { goTo(indexRef.current + 1); return; }
                    clampPan();
                } else if (Math.abs(gesture.dx) > SWIPE_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
                    goTo(gesture.dx > 0 ? indexRef.current - 1 : indexRef.current + 1);
                }
            },
            onPanResponderTerminate: () => {
                if (live.current.scale <= 1.01) reset(); else clampPan();
            },
        })
    ).current;

    const raw = images[index];
    const source = raw ? (typeof raw === 'string' ? { uri: raw } : raw) : undefined;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.stage} {...pan.panHandlers}>
                    {source && (
                        <Animated.Image
                            source={source}
                            style={[styles.image, { transform: [{ scale }, { translateX: tx }, { translateY: ty }] }]}
                            resizeMode="contain"
                        />
                    )}
                </View>
                {/* Rendered after the image so it always stays on top, even when the
                    image is scaled up — zIndex alone isn't reliably respected across
                    platforms for transformed siblings. */}
                <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={26} color="#FFFFFF" />
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: '#000000' },
    close: {
        position: 'absolute', top: 48, right: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
        ...Platform.select({ android: { elevation: 10 } }),
    },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    image: { width: SCREEN_W, height: SCREEN_H },
});
