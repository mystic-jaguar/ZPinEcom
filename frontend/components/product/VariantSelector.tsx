import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Map common color names to hex for display
const COLOR_MAP: Record<string, string> = {
    red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#FBBF24',
    black: '#1a1a1a', white: '#F9FAFB', grey: '#9CA3AF', gray: '#9CA3AF',
    pink: '#EC4899', purple: '#A855F7', orange: '#F97316', brown: '#92400E',
    navy: '#1E3A5F', maroon: '#7F1D1D', beige: '#D4B896', cream: '#FFF8E7',
    teal: '#14B8A6', indigo: '#6366F1', violet: '#7C3AED', gold: '#D97706',
    silver: '#94A3B8', coral: '#F87171', mint: '#6EE7B7', lavender: '#C4B5FD',
};

interface VariantSelectorProps {
    colors?: string[];
    sizes?: string[];
    sizeQuantities?: Record<string, number>;
    selectedColor?: string;
    selectedSize?: string;
    onSelectColor?: (color: string) => void;
    onSelectSize?: (size: string) => void;
}

export default function VariantSelector({
    colors,
    sizes,
    sizeQuantities,
    selectedColor,
    selectedSize,
    onSelectColor,
    onSelectSize,
}: VariantSelectorProps) {
    if ((!colors || colors.length === 0) && (!sizes || sizes.length === 0)) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Color Selector */}
            {colors && colors.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.label}>
                        COLOR{selectedColor ? `: ${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}` : ''}
                    </Text>
                    <View style={styles.row}>
                        {colors.map((color) => {
                            const isSelected = selectedColor === color;
                            const hex = COLOR_MAP[color.toLowerCase()] || '#E5E7EB';
                            const isDark = ['black', 'navy', 'maroon', 'indigo', 'violet'].includes(color.toLowerCase());
                            return (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => onSelectColor?.(color)}
                                    style={[
                                        styles.colorChip,
                                        { backgroundColor: hex },
                                        isSelected && styles.colorChipSelected,
                                        color.toLowerCase() === 'white' && styles.colorChipWhite,
                                    ]}
                                >
                                    <Text style={[
                                        styles.colorChipText,
                                        { color: isDark ? '#fff' : '#1a1a1a' },
                                    ]}>
                                        {color.charAt(0).toUpperCase() + color.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Size Selector */}
            {sizes && sizes.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sizeHeaderRow}>
                        <Text style={styles.label}>SIZE</Text>
                        <Text style={styles.sizeChartLink}>Size Chart</Text>
                    </View>
                    <View style={styles.row}>
                        {sizes.map((size) => {
                            const isSelected = selectedSize === size;
                            const stock = sizeQuantities?.[size];
                            const outOfStock = stock !== undefined && stock === 0;
                            return (
                                <TouchableOpacity
                                    key={size}
                                    onPress={() => !outOfStock && onSelectSize?.(size)}
                                    style={[
                                        styles.sizeBox,
                                        isSelected && styles.selectedSizeBox,
                                        outOfStock && styles.outOfStockBox,
                                    ]}
                                    disabled={outOfStock}
                                >
                                    <Text style={[
                                        styles.sizeText,
                                        isSelected && styles.selectedSizeText,
                                        outOfStock && styles.outOfStockText,
                                    ]}>
                                        {size}
                                    </Text>
                                    {stock !== undefined && stock > 0 && stock <= 5 && (
                                        <Text style={styles.lowStockText}>Only {stock} left</Text>
                                    )}
                                    {outOfStock && (
                                        <Text style={styles.outOfStockCaption}>Out of stock</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {sizeQuantities && sizes.every((s) => sizeQuantities[s] === 0) && (
                        <Text style={styles.unavailableNote}>
                            This product is currently not available in any size.
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 15 },
    section: { marginBottom: 20 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sizeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#333',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    sizeChartLink: {
        fontSize: 12,
        color: '#FBBF24',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    // Color chips
    colorChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorChipSelected: {
        borderColor: '#1a1a1a',
    },
    colorChipWhite: {
        borderColor: '#E5E7EB',
    },
    colorChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Size boxes
    sizeBox: {
        minWidth: 50,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    selectedSizeBox: {
        borderColor: '#FBBF24',
        backgroundColor: '#FFFBE6',
    },
    outOfStockBox: {
        borderColor: '#F3F4F6',
        backgroundColor: '#F9FAFB',
        opacity: 0.5,
    },
    sizeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    selectedSizeText: {
        color: '#1a1a1a',
        fontWeight: '700',
    },
    outOfStockText: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    lowStockText: {
        fontSize: 9,
        color: '#EF4444',
        fontWeight: '600',
        marginTop: 2,
    },
    outOfStockCaption: {
        fontSize: 9,
        color: '#9CA3AF',
        fontWeight: '600',
        marginTop: 2,
    },
    unavailableNote: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '600',
        marginTop: 8,
    },
});
