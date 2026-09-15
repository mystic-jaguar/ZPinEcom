import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import ActionModal from '../components/common/ActionModal';
import { useUser } from './UserContext';

/**
 * Guests browse freely (2026-09-15); an action that needs an account asks first.
 * `requireAuth(msg)` returns true when signed in, else shows the login modal and
 * returns false. Login pops back to the screen that asked (see app/_layout.tsx).
 */
const AuthPromptContext = createContext<(message?: string) => boolean>(() => true);

export const AuthPromptProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useUser();
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);

    const requireAuth = useCallback((msg?: string) => {
        if (isAuthenticated) return true;
        setMessage(msg || 'Log in to continue.');
        return false;
    }, [isAuthenticated]);

    const close = () => setMessage(null);

    return (
        <AuthPromptContext.Provider value={requireAuth}>
            {children}
            <ActionModal
                visible={!!message}
                icon="lock"
                title="Login required"
                message={message ?? ''}
                primaryButtonText="Log in"
                onPrimaryPress={() => { close(); router.push('/auth/login'); }}
                secondaryButtonText="Not now"
                onSecondaryPress={close}
                onClose={close}
            />
        </AuthPromptContext.Provider>
    );
};

export const useRequireAuth = () => useContext(AuthPromptContext);
