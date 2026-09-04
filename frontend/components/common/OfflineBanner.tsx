import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../context/NetworkContext';
import { Text } from '../ui/ScaledText';
import { createStyles } from '../../constants/theme';

// App-wide connectivity strip. Mounted once at the root so every screen gets it
// without opting in; renders nothing while online.
export default function OfflineBanner() {
    const { isOnline, justReconnected } = useNetwork();
    const insets = useSafeAreaInsets();

    if (isOnline && !justReconnected) return null;

    const online = isOnline;
    return (
        <View
            pointerEvents="none"
            style={[styles.bar, { paddingTop: insets.top + 8 }, online ? styles.online : styles.offline]}
        >
            <Feather name={online ? 'wifi' : 'wifi-off'} size={14} color="#fff" />
            <Text style={styles.text}>
                {online ? 'Back online' : 'No internet connection'}
            </Text>
        </View>
    );
}

const styles = createStyles({
    bar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: 8,
    },
    offline: { backgroundColor: '#B71C1C' },
    online: { backgroundColor: '#2E7D32' },
    text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
