import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const EDGE_SWITCH_THRESHOLD = 60;
const SWIPE_THRESHOLD = 60;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Keep the image from being dragged entirely off-screen: at scale s only
// (s-1)/2 of each edge can be hidden. Marked 'worklet' so it can be called
// directly from the gesture callbacks below, which run on the UI thread.
const bounds = (s: number) => {
    'worklet';
    return {
        maxX: (SCREEN_W * (s - 1)) / 2,
        maxY: (SCREEN_H * (s - 1)) / 2,
    };
};

/**
 * Full-screen pinch-to-zoom viewer for a product's image gallery.
 *
 * Built on react-native-gesture-handler + reanimated, not RN's own
 * PanResponder: PanResponder's `touches` array is well-known to be
 * unreliable for two-finger gestures (a pinch reports a start event
 * immediately followed by a terminate, with no moves in between —
 * https://github.com/facebook/react-native/issues/8094), because it's a
 * pure-JS reconstruction of native touch events. gesture-handler tracks
 * multi-touch natively instead.
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

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const savedTx = useSharedValue(0);
    const savedTy = useSharedValue(0);

    // No-animation reset, e.g. when switching photos or reopening.
    const resetImmediate = () => {
        scale.value = 1; savedScale.value = 1;
        tx.value = 0; savedTx.value = 0;
        ty.value = 0; savedTy.value = 0;
    };

    // Animated reset, called from inside gesture worklets (UI thread).
    const resetAnimatedUI = () => {
        'worklet';
        scale.value = withTiming(1, { duration: 180 });
        tx.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(0, { duration: 180 });
        savedScale.value = 1; savedTx.value = 0; savedTy.value = 0;
    };

    const clampPanUI = () => {
        'worklet';
        const { maxX, maxY } = bounds(scale.value);
        const x = clamp(tx.value, -maxX, maxX);
        const y = clamp(ty.value, -maxY, maxY);
        tx.value = withTiming(x, { duration: 150 });
        ty.value = withTiming(y, { duration: 150 });
        savedTx.value = x;
        savedTy.value = y;
    };

    // Reopening (or switching photos) must not inherit the previous zoom.
    useEffect(() => { if (visible) { setIndex(initialIndex); resetImmediate(); } }, [visible, initialIndex]);

    const goTo = (next: number) => {
        const clamped = clamp(next, 0, images.length - 1);
        if (clamped === index) { clampPanUI(); return; }
        setIndex(clamped);
        onIndexChange?.(clamped);
        resetImmediate();
    };

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            if (scale.value <= 1.01) resetAnimatedUI(); else clampPanUI();
        });

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                const { maxX, maxY } = bounds(scale.value);
                tx.value = clamp(savedTx.value + e.translationX, -maxX, maxX);
                ty.value = clamp(savedTy.value + e.translationY, -maxY, maxY);
            }
        })
        .onEnd((e) => {
            if (scale.value > 1) {
                // Zoomed: only switch photos once the drag has pushed past the
                // pan boundary (i.e. there's nowhere left to pan to).
                const { maxX } = bounds(scale.value);
                const attemptedX = savedTx.value + e.translationX;
                if (attemptedX - maxX > EDGE_SWITCH_THRESHOLD) { runOnJS(goTo)(index - 1); return; }
                if (-maxX - attemptedX > EDGE_SWITCH_THRESHOLD) { runOnJS(goTo)(index + 1); return; }
                clampPanUI();
            } else if (Math.abs(e.translationX) > SWIPE_THRESHOLD && Math.abs(e.translationX) > Math.abs(e.translationY)) {
                runOnJS(goTo)(e.translationX > 0 ? index - 1 : index + 1);
            }
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((_e, success) => {
            if (!success) return;
            if (scale.value > 1) {
                resetAnimatedUI();
            } else {
                scale.value = withTiming(2, { duration: 180 });
                savedScale.value = 2;
            }
        });

    // Double-tap must win the race before pan/pinch claim the touch; once
    // either of those activates (movement/second finger), the tap is moot.
    const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pan, pinch));

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: tx.value }, { translateY: ty.value }],
    }));

    const raw = images[index];
    const source = raw ? (typeof raw === 'string' ? { uri: raw } : raw) : undefined;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            {/* RN's Modal renders into its own native surface (a separate window
                on Android), which the app-level GestureHandlerRootView doesn't
                reach — gesture-handler needs one inside the modal too. */}
            <GestureHandlerRootView style={styles.backdrop}>
                <View style={styles.backdrop}>
                    <GestureDetector gesture={composed}>
                        <View style={styles.stage}>
                            {source && (
                                <Animated.Image
                                    source={source}
                                    style={[styles.image, animatedStyle]}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </GestureDetector>
                    {/* Rendered after the image so it always stays on top, even when the
                        image is scaled up — zIndex alone isn't reliably respected across
                        platforms for transformed siblings. */}
                    <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
                        <Ionicons name="close" size={26} color="#FFFFFF" />
                    </Pressable>
                </View>
            </GestureHandlerRootView>
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
