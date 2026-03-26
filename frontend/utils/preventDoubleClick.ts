/**
 * Utility to prevent double-click/double-tap on buttons
 * Usage: wrap your onPress handler with this function
 * 
 * Example:
 * <TouchableOpacity onPress={preventDoubleClick(() => handleAction())}>
 */

let lastClickTime = 0;
const DOUBLE_CLICK_DELAY = 500; // milliseconds

export const preventDoubleClick = (callback: () => void, delay: number = DOUBLE_CLICK_DELAY) => {
    return () => {
        const now = Date.now();
        if (now - lastClickTime < delay) {
            return; // Ignore this click
        }
        lastClickTime = now;
        callback();
    };
};

/**
 * React Hook version for preventing double clicks
 * Usage in component:
 * 
 * const handlePress = usePreventDoubleClick(() => {
 *   // your action here
 * });
 */
export const usePreventDoubleClick = (callback: () => void, delay: number = DOUBLE_CLICK_DELAY) => {
    const lastClickRef = React.useRef(0);

    return React.useCallback(() => {
        const now = Date.now();
        if (now - lastClickRef.current < delay) {
            return;
        }
        lastClickRef.current = now;
        callback();
    }, [callback, delay]);
};

// For React Native
import React from 'react';
