import { Redirect } from 'expo-router';
import { useUser } from '../context/UserContext';

/**
 * Root index — redirects based on auth status.
 * The animated splash is handled by AnimatedSplash in _layout.tsx.
 */
export default function Index() {
    const { isAuthenticated } = useUser();
    return <Redirect href={isAuthenticated ? '/(tabs)' : '/auth/login'} />;
}
