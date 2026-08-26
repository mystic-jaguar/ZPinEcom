import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
                            return (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => onSelectColor?.(color)}
                                    style={[
                                        styles.colorChip,
                                        isSelected && styles.colorChipSelected,
                                    ]}
                                >
                                    <Text style={[
                                        styles.colorChipText,
                                        isSelected && styles.colorChipTextSelected,
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
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    colorChipSelected: {
        borderColor: '#FBBF24',
        backgroundColor: '#FFFBE6',
    },
    colorChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
    },
    colorChipTextSelected: {
        color: '#1a1a1a',
        fontWeight: '700',
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
