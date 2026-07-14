import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, palette, radius } from '../../constants/theme';

export interface FilterState {
    sortBy: 'relevance' | 'new' | 'price_low' | 'price_high' | 'rating' | 'discount';
    priceRanges: string[];
    brands: string[];
    ratings: string[];
    discounts: string[];
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters: FilterState;
    availableBrands: string[]; // Dynamic brands from current products
}

const SIDEBAR_ITEMS = [
    { id: 'sort', label: 'Sort By' },
    { id: 'price', label: 'Price' },
    { id: 'brand', label: 'Brand' },
    { id: 'rating', label: 'Customer Rating' },
];

const SORT_OPTIONS = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'new', label: 'New Arrivals' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
    { id: 'rating', label: 'Customer Rating' },
];

const PRICE_RANGES = [
    'Under ₹500',
    '₹500 - ₹1000',
    '₹1000 - ₹2000',
    '₹2000 - ₹5000',
    'Above ₹5000'
];

const RATINGS = [
    '4.0 & above',
    '3.0 & above',
    '2.0 & above',
];

export default function FilterModal({ visible, onClose, onApply, initialFilters, availableBrands }: FilterModalProps) {
    const [activeTab, setActiveTab] = useState<string>('sort');
    const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);
    const insets = useSafeAreaInsets();

    // Reset temp filters when modal opens
    useEffect(() => {
        if (visible) {
            setTempFilters(initialFilters);
            setActiveTab('sort');
        }
    }, [visible, initialFilters]);

    const handleApply = () => {
        onApply(tempFilters);
        onClose();
    };

    const handleClearAll = () => {
        setTempFilters({
            sortBy: 'relevance',
            priceRanges: [],
            brands: [],
            ratings: [],
            discounts: []
        });
    };

    // Helper to toggle checkbox values in arrays
    const toggleFilter = (key: keyof FilterState, value: string) => {
        setTempFilters(prev => {
            const currentList = prev[key] as string[];
            if (currentList.includes(value)) {
                return { ...prev, [key]: currentList.filter(item => item !== value) };
            } else {
                return { ...prev, [key]: [...currentList, value] };
            }
        });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'sort':
                return (
                    <View style={styles.optionsContainer}>
                        {SORT_OPTIONS.map(option => (
                            <TouchableOpacity
                                key={option.id}
                                style={styles.radioOption}
                                onPress={() => setTempFilters(prev => ({ ...prev, sortBy: option.id as any }))}
                            >
                                <Text style={[styles.optionLabel, tempFilters.sortBy === option.id && styles.optionLabelSelected]}>
                                    {option.label}
                                </Text>
                                <View style={[styles.radioCircle, tempFilters.sortBy === option.id && styles.radioCircleSelected]}>
                                    {tempFilters.sortBy === option.id && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 'price':
                return (
                    <View style={styles.optionsContainer}>
                        {PRICE_RANGES.map(range => (
                            <TouchableOpacity
                                key={range}
                                style={styles.checkboxOption}
                                onPress={() => toggleFilter('priceRanges', range)}
                            >
                                <View style={[styles.checkbox, tempFilters.priceRanges.includes(range) && styles.checkboxSelected]}>
                                    {tempFilters.priceRanges.includes(range) && <Ionicons name="checkmark" size={15} color={colors.textInvert} />}
                                </View>
                                <Text style={[styles.optionLabel, tempFilters.priceRanges.includes(range) && styles.optionLabelSelected]}>
                                    {range}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 'brand':
                return (
                    <ScrollView contentContainerStyle={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                        {availableBrands.length > 0 ? availableBrands.map(brand => (
                            <TouchableOpacity
                                key={brand}
                                style={styles.checkboxOption}
                                onPress={() => toggleFilter('brands', brand)}
                            >
                                <View style={[styles.checkbox, tempFilters.brands.includes(brand) && styles.checkboxSelected]}>
                                    {tempFilters.brands.includes(brand) && <Ionicons name="checkmark" size={15} color={colors.textInvert} />}
                                </View>
                                <Text style={[styles.optionLabel, tempFilters.brands.includes(brand) && styles.optionLabelSelected]}>
                                    {brand}
                                </Text>
                            </TouchableOpacity>
                        )) : (
                            <Text style={styles.emptyText}>No brands available</Text>
                        )}
                    </ScrollView>
                );
            case 'rating':
                return (
                    <View style={styles.optionsContainer}>
                        {RATINGS.map(rating => (
                            <TouchableOpacity
                                key={rating}
                                style={styles.checkboxOption}
                                onPress={() => toggleFilter('ratings', rating)}
                            >
                                <View style={[styles.checkbox, tempFilters.ratings.includes(rating) && styles.checkboxSelected]}>
                                    {tempFilters.ratings.includes(rating) && <Ionicons name="checkmark" size={15} color={colors.textInvert} />}
                                </View>
                                <Text style={[styles.optionLabel, tempFilters.ratings.includes(rating) && styles.optionLabelSelected]}>
                                    {rating}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            default:
                return null;
        }
    };

    const activeFilterCount =
        tempFilters.priceRanges.length +
        tempFilters.brands.length +
        tempFilters.ratings.length;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <Pressable onPress={onClose} style={styles.closeIcon} hitSlop={8}>
                        <X size={22} color={colors.textStrong} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Sort & filter</Text>
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear all</Text>
                    </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.body}>
                    {/* Sidebar */}
                    <View style={styles.sidebar}>
                        {SIDEBAR_ITEMS.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.sidebarItem, activeTab === item.id && styles.sidebarItemActive]}
                                onPress={() => setActiveTab(item.id)}
                            >
                                {activeTab === item.id && <View style={styles.activeIndicator} />}
                                <Text style={[styles.sidebarText, activeTab === item.id && styles.sidebarTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {renderContent()}
                    </View>
                </View>

                {/* Footer */}
                <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
                    {activeFilterCount > 0 && (
                        <View style={styles.filterCountContainer}>
                            <Text style={styles.filterCountText}>{activeFilterCount} Filters Applied</Text>
                        </View>
                    )}
                    <View style={styles.footerButtons}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: palette.paperWarm,
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        backgroundColor: palette.paperWarm,
    },
    filterCountContainer: {
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: colors.surfaceBrandTint,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    filterCountText: {
        fontFamily: fonts.monoBold,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: colors.textBody,
    },
    footerButtons: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: palette.paperWarm,
    },
    closeIcon: {
        width: 32,
        alignItems: 'flex-start',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: fonts.bodyBlack,
        fontSize: 18,
        color: colors.textStrong,
    },
    clearButton: {
        width: 56,
        alignItems: 'flex-end',
    },
    clearButtonText: {
        fontFamily: fonts.bodyBold,
        fontSize: 13,
        color: colors.accentRed,
    },
    body: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: '36%',
        backgroundColor: colors.surfaceSunken,
        borderRightWidth: 1,
        borderRightColor: colors.borderSubtle,
    },
    sidebarItem: {
        paddingVertical: 18,
        paddingHorizontal: 16,
        position: 'relative',
    },
    sidebarItemActive: {
        backgroundColor: palette.paperWarm,
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: colors.brand,
    },
    sidebarText: {
        fontFamily: fonts.bodyMedium,
        fontSize: 14,
        color: colors.textMuted,
    },
    sidebarTextActive: {
        fontFamily: fonts.bodyBold,
        color: colors.textStrong,
    },
    content: {
        flex: 1,
        backgroundColor: palette.paperWarm,
    },
    optionsContainer: {
        padding: 20,
    },
    // Radio Option (Sort)
    radioOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 4,
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: colors.borderInk,
    },
    radioInner: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: colors.surfaceInverse,
    },
    // Checkbox Option
    checkboxOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        borderColor: colors.borderInk,
        backgroundColor: colors.surfaceInverse,
    },
    optionLabel: {
        fontFamily: fonts.bodyMedium,
        fontSize: 14,
        color: colors.textBody,
    },
    optionLabelSelected: {
        fontFamily: fonts.bodyBold,
        color: colors.textStrong,
    },
    emptyText: {
        fontFamily: fonts.bodyRegular,
        color: colors.textFaint,
        fontStyle: 'italic',
        marginTop: 10,
    },
    closeButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceCard,
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: fonts.bodyBold,
        fontSize: 15,
        color: colors.textStrong,
    },
    applyButton: {
        flex: 1.6,
        paddingVertical: 15,
        borderRadius: radius.md,
        backgroundColor: colors.brand,
        alignItems: 'center',
    },
    applyButtonText: {
        fontFamily: fonts.bodyBlack,
        fontSize: 15,
        color: colors.textOnYellow,
    },
});
