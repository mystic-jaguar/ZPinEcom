import { useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import ActionModal from '../components/common/ActionModal';

interface ExitGuardOptions {
    /** Only guard while there is work worth losing. */
    enabled: boolean;
    title?: string;
    message?: string;
    /** Confirm-label for the destructive choice. */
    discardLabel?: string;
    /** Runs after the user confirms leaving, before navigation proceeds. */
    onDiscard?: () => void;
}

/**
 * Confirms before a multi-step form is abandoned.
 *
 * Covers all four ways out of a screen with one hook:
 *  - Android hardware back  → `BackHandler` (consumes the event, so the
 *    navigator's own pop never runs and `beforeRemove` cannot double-fire)
 *  - header back / `router.back()` → `beforeRemove`
 *  - iOS swipe-back gesture → `beforeRemove` cannot reliably veto a native
 *    gesture mid-swipe, so the gesture is disabled while the guard is armed
 *
 * Returns a `ConfirmModal` element (built on the app's shared `ActionModal`,
 * not the OS `Alert`) that the caller must render.
 */
export function useExitGuard({
    enabled,
    title = 'Discard progress?',
    message = 'Your progress on this screen will be lost.',
    discardLabel = 'Discard',
    onDiscard,
}: ExitGuardOptions) {
    const navigation = useNavigation();
    const [pendingProceed, setPendingProceed] = useState<(() => void) | null>(null);
    const onDiscardRef = useRef(onDiscard);
    onDiscardRef.current = onDiscard;

    useEffect(() => {
        // Native-stack swipe-back can't be vetoed once it starts — turn it off
        // rather than let it silently bypass the guard.
        navigation.setOptions?.({ gestureEnabled: !enabled });
    }, [enabled, navigation]);

    useEffect(() => {
        if (!enabled) return;

        const confirm = (proceed: () => void) => setPendingProceed(() => proceed);

        const back = BackHandler.addEventListener('hardwareBackPress', () => {
            confirm(() => navigation.dispatch({ type: 'POP', payload: {} } as any));
            return true;
        });

        const beforeRemove = navigation.addListener('beforeRemove' as any, (e: any) => {
            e.preventDefault();
            confirm(() => navigation.dispatch(e.data.action));
        });

        return () => {
            back.remove();
            beforeRemove();
        };
    }, [enabled, navigation]);

    const ConfirmModal = React.createElement(ActionModal, {
        visible: !!pendingProceed,
        title,
        message,
        icon: 'alert-triangle',
        primaryButtonText: discardLabel,
        onPrimaryPress: () => {
            const proceed = pendingProceed;
            setPendingProceed(null);
            onDiscardRef.current?.();
            proceed?.();
        },
        secondaryButtonText: 'Stay',
        onSecondaryPress: () => setPendingProceed(null),
        onClose: () => setPendingProceed(null),
    });

    return { ConfirmModal };
}
