import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VariantSelectorProps {
    colors?: string[];
    sizes?: string[];
    selectedColor?: string;
    selectedSize?: string;
    onSelectColor?: (color: string) => void;
    onSelectSize?: (size: string) => void;
}

export default function VariantSelector({
    colors,
    sizes,
    selectedColor,
    selectedSize,
    onSelectColor,
    onSelectSize
}: VariantSelectorProps) {

    return (
        <View style={styles.container}>
            {/* Color Selector */}
            {colors && colors.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.row}>
                        {colors.map((color, index) => {
                            const isSelected = selectedColor === color;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => onSelectColor?.(color)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        isSelected && styles.selectedColorBorder
                                    ]}
                                >
                                    {isSelected && <View style={styles.innerWhiteDot} />}
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
                        <Text style={styles.label}>SELECT SIZE</Text>
                        <Text style={styles.sizeChartLink}>Size Chart</Text>
                    </View>

                    <View style={styles.row}>
                        {sizes.map((size, index) => {
                            const isSelected = selectedSize === size;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => onSelectSize?.(size)}
                                    style={[
                                        styles.sizeBox,
                                        isSelected && styles.selectedSizeBox
                                    ]}
                                >
                                    <Text style={[
                                        styles.sizeText,
                                        isSelected && styles.selectedSizeText
                                    ]}>
                                        {size}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 15
    },
    section: {
        marginBottom: 20
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap'
    },
    sizeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#333',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    sizeChartLink: {
        fontSize: 12,
        color: '#FBBF24',
        fontWeight: '600',
        textDecorationLine: 'underline'
    },

    // Color Styles
    colorCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        borderWidth: 2,
        borderColor: 'white' // Default border
    },
    selectedColorBorder: {
        borderColor: '#1a1a1a', // Active border
    },
    innerWhiteDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff'
    },

    // Size Styles
    sizeBox: {
        width: 45,
        height: 45,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#fff'
    },
    selectedSizeBox: {
        borderColor: '#FBBF24',
        backgroundColor: '#FFFBE6'
    },
    sizeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555'
    },
    selectedSizeText: {
        color: '#1a1a1a'
    }
});
