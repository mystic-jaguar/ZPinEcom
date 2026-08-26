import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VariantSelectorProps {
    sizes?: string[];
    sizeQuantities?: Record<string, number>;
    selectedSize?: string;
    onSelectSize?: (size: string) => void;
}

// Same chart the customer website shows (ProductDetail.jsx)
const SIZE_CHART_ROWS = [
    ['XS', '36', '26', '16.5'],
    ['S', '38', '27', '17'],
    ['M', '40', '28', '17.5'],
    ['L', '42', '29', '18'],
    ['XL', '44', '30', '18.5'],
    ['XXL', '46', '31', '19'],
];

export default function VariantSelector({
    sizes,
    sizeQuantities,
    selectedSize,
    onSelectSize,
}: VariantSelectorProps) {
    const [sizeChartOpen, setSizeChartOpen] = useState(false);

    if (!sizes || sizes.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Size Selector */}
            {sizes && sizes.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sizeHeaderRow}>
                        <Text style={styles.label}>SIZE</Text>
                        <TouchableOpacity onPress={() => setSizeChartOpen(true)}>
                            <Text style={styles.sizeChartLink}>Size Chart</Text>
                        </TouchableOpacity>
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

            <Modal visible={sizeChartOpen} transparent animationType="fade" onRequestClose={() => setSizeChartOpen(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setSizeChartOpen(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <Text style={styles.modalTitle}>Size Chart</Text>
                        <View style={styles.chartTable}>
                            <View style={[styles.chartRow, styles.chartHeadRow]}>
                                {['Size', 'Chest (in)', 'Length (in)', 'Shoulder (in)'].map((h) => (
                                    <Text key={h} style={[styles.chartCell, styles.chartHeadCell]}>{h}</Text>
                                ))}
                            </View>
                            {SIZE_CHART_ROWS.map((row) => (
                                <View key={row[0]} style={styles.chartRow}>
                                    {row.map((cell, i) => (
                                        <Text key={i} style={[styles.chartCell, i === 0 && styles.chartCellFirst]}>{cell}</Text>
                                    ))}
                                </View>
                            ))}
                        </View>
                        <Text style={styles.chartNote}>Measurements are approximate — actual fit may vary slightly by style.</Text>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSizeChartOpen(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },
    chartTable: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
    chartRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    chartHeadRow: { borderTopWidth: 0, backgroundColor: '#F9FAFB' },
    chartCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, fontSize: 12, color: '#555', textAlign: 'center' },
    chartHeadCell: { fontWeight: '700', color: '#1a1a1a' },
    chartCellFirst: { fontWeight: '700', color: '#1a1a1a' },
    chartNote: { fontSize: 11, color: '#888', marginTop: 10 },
    modalCloseBtn: {
        marginTop: 16,
        alignSelf: 'flex-end',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalCloseText: { fontSize: 14, fontWeight: '600', color: '#333' },
});
