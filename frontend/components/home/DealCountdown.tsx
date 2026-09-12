import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createStyles, fonts, palette } from '../../constants/theme';
import { Text } from '../ui/ScaledText';

/** "2h 05m 09s" / "05m 09s" — byte-for-byte the website's flash-deal format. */
export function formatRemaining(ms: number): string {
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Live "ends in" pill for a flash deal.
 *
 * Deliberately its own component with its own interval: the home screen renders a
 * long scroll list, and hoisting this state up would re-render all of it once a
 * second. One interval per visible deal card (max 8) is the cheaper trade.
 */
export default function DealCountdown({ endsAt }: { endsAt: string }) {
    const end = new Date(endsAt).getTime();
    const [label, setLabel] = useState(() => formatRemaining(end - Date.now()));

    useEffect(() => {
        if (!Number.isFinite(end)) return;
        const tick = () => setLabel(formatRemaining(end - Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [end]);

    if (!Number.isFinite(end)) return null;

    return (
        <View style={styles.pill}>
            <Text style={styles.text}>⏱ {label}</Text>
        </View>
    );
}

const styles = createStyles({
    pill: {
        alignSelf: 'flex-start', marginTop: 6,
        backgroundColor: palette.danger50, borderRadius: 100,
        paddingHorizontal: 9, paddingVertical: 4,
    },
    text: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.4, color: palette.danger500 },
});
