import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';

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
 */
export function useExitGuard({
    enabled,
    title = 'Discard progress?',
    message = 'Your progress on this screen will be lost.',
    discardLabel = 'Discard',
    onDiscard,
}: ExitGuardOptions) {
    const navigation = useNavigation();

    useEffect(() => {
        // Native-stack swipe-back can't be vetoed once it starts — turn it off
        // rather than let it silently bypass the guard.
        navigation.setOptions?.({ gestureEnabled: !enabled });
    }, [enabled, navigation]);

    useEffect(() => {
        if (!enabled) return;

        const confirm = (proceed: () => void) => {
            Alert.alert(title, message, [
                { text: 'Stay', style: 'cancel' },
                {
                    text: discardLabel,
                    style: 'destructive',
                    onPress: () => { onDiscard?.(); proceed(); },
                },
            ]);
        };

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
    }, [enabled, navigation, title, message, discardLabel, onDiscard]);
}
