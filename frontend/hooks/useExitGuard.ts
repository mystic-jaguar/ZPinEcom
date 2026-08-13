import { useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
 * Covers every way out of a screen with one hook:
 *  - Android hardware back, header back and `router.back()` all go through the
 *    navigator, so `beforeRemove` alone catches them. (A separate BackHandler
 *    would have to synthesise its own POP action, which is what used to crash.)
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

    // Set once the user has confirmed, so re-dispatching the very action we
    // just blocked isn't blocked again (which would re-open the modal forever).
    const allowRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;
        const beforeRemove = navigation.addListener('beforeRemove' as any, (e: any) => {
            if (allowRef.current) return;
            e.preventDefault();
            setPendingProceed(() => () => {
                allowRef.current = true;
                navigation.dispatch(e.data.action);
            });
        });
        return beforeRemove;
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
