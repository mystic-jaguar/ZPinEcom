import { Redirect } from 'expo-router';

/**
 * Root index. Guests browse too (2026-09-15) — login is asked for per action,
 * see context/AuthPromptContext. The splash is AnimatedSplash in _layout.tsx.
 */
export default function Index() {
    return <Redirect href="/(tabs)" />;
}
