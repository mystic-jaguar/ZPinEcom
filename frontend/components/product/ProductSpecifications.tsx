import { CalendarDays, Grid3x3, MapPin, Palette, Ruler, Shirt, Tag, Waypoints } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, palette, radius } from '../../constants/theme';
import { ProductSpecification } from '../../types/types';

// Same loose code match (and the same icon meanings) as the customer website's
// Specifications card, so a new EAV attribute still gets a sane default icon
// instead of nothing.
const SPEC_ICONS: Record<string, any> = {
    color: Palette,
    fabric: Grid3x3,
    fit: Shirt,
    neck: MapPin,
    occasion: CalendarDays,
    pattern: Waypoints,
    size: Ruler,
    sleeve: Shirt,
};

const iconFor = (code = '') => {
    const key = Object.keys(SPEC_ICONS).find((k) => code.toLowerCase().includes(k));
    return key ? SPEC_ICONS[key] : Tag;
};

export default function ProductSpecifications({ specs }: { specs: ProductSpecification[] }) {
    if (!specs || specs.length === 0) return null;

    return (
        <View style={styles.wrap}>
            <Text style={styles.heading}>Specifications</Text>
            {specs.map((spec) => {
                const Icon = iconFor(spec.code);
                return (
                    <View style={styles.row} key={spec.code}>
                        <View style={styles.iconBox}>
                            <Icon size={16} color={palette.yellow600} />
                        </View>
                        <View style={styles.text}>
                            <Text style={styles.label}>
                                {spec.name}{spec.unit ? ` (${spec.unit})` : ''}
                            </Text>
                            <Text style={styles.value}>{spec.values.join(', ')}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginTop: 16 },
    heading: { fontSize: 14, fontWeight: '700', color: colors.textStrong, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: radius.sm,
        backgroundColor: palette.yellow50,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    text: { flex: 1 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    value: { fontSize: 14, fontWeight: '600', color: colors.textStrong },
});
