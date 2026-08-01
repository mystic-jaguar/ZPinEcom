import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen pinch-to-zoom viewer for one product image.
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
    source,
    onClose,
}: {
    visible: boolean;
    source: any;
    onClose: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const tx = useRef(new Animated.Value(0)).current;
    const ty = useRef(new Animated.Value(0)).current;

    // Animated.Value has no public synchronous getter, so mirror the live values
    // into refs — the pan handlers need them mid-gesture.
    const live = useRef({ scale: 1, x: 0, y: 0 });
    // Where the current gesture started from.
    const start = useRef({ scale: 1, x: 0, y: 0, dist: 0 });
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

    // Reopening on a different image must not inherit the previous zoom.
    useEffect(() => { if (visible) reset(false); }, [visible, source]);

    // Keep the image from being dragged entirely off-screen: at scale s only
    // (s-1)/2 of each edge can be hidden.
    const clampPan = () => {
        const s = live.current.scale;
        const maxX = (SCREEN_W * (s - 1)) / 2;
        const maxY = (SCREEN_H * (s - 1)) / 2;
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
                start.current = { scale: live.current.scale, x: live.current.x, y: live.current.y, dist: 0 };

                // Double-tap toggles between fit and 2x, the gesture people
                // reach for before they think to pinch.
                const now = Date.now();
                if (now - lastTap.current < DOUBLE_TAP_MS && e.nativeEvent.touches.length === 1) {
                    lastTap.current = 0;
                    if (live.current.scale > 1) reset();
                    else Animated.timing(scale, { toValue: 2, duration: 180, useNativeDriver: true }).start();
                    return;
                }
                lastTap.current = now;
            },
            onPanResponderMove: (e, gesture) => {
                const touches = e.nativeEvent.touches;
                if (touches.length >= 2) {
                    const dx = touches[0].pageX - touches[1].pageX;
                    const dy = touches[0].pageY - touches[1].pageY;
                    const dist = Math.hypot(dx, dy);
                    if (!start.current.dist) { start.current.dist = dist; return; }
                    scale.setValue(clamp(start.current.scale * (dist / start.current.dist), MIN_SCALE, MAX_SCALE));
                } else if (live.current.scale > 1) {
                    tx.setValue(start.current.x + gesture.dx);
                    ty.setValue(start.current.y + gesture.dy);
                }
            },
            onPanResponderRelease: () => {
                if (live.current.scale <= 1.01) reset();
                else clampPan();
            },
            onPanResponderTerminate: () => clampPan(),
        })
    ).current;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={26} color="#FFFFFF" />
                </Pressable>
                <View style={styles.stage} {...pan.panHandlers}>
                    <Animated.Image
                        source={source}
                        style={[styles.image, { transform: [{ scale }, { translateX: tx }, { translateY: ty }] }]}
                        resizeMode="contain"
                    />
                </View>
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
    },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    image: { width: SCREEN_W, height: SCREEN_H },
});
