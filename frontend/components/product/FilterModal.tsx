import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

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
    { id: 'discount', label: 'Discount' },
];

const SORT_OPTIONS = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'new', label: 'New Arrivals' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
    { id: 'rating', label: 'Customer Rating' },
    { id: 'discount', label: 'Discount' },
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

const DISCOUNTS = [
    '10% or more',
    '30% or more',
    '50% or more',
    '70% or more',
];

export default function FilterModal({ visible, onClose, onApply, initialFilters, availableBrands }: FilterModalProps) {
    const [activeTab, setActiveTab] = useState<string>('sort');
    const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);

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
                                    {tempFilters.priceRanges.includes(range) && <Ionicons name="checkmark" size={14} color="#000" />}
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
                                    {tempFilters.brands.includes(brand) && <Ionicons name="checkmark" size={14} color="#000" />}
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
                                    {tempFilters.ratings.includes(rating) && <Ionicons name="checkmark" size={14} color="#000" />}
                                </View>
                                <Text style={[styles.optionLabel, tempFilters.ratings.includes(rating) && styles.optionLabelSelected]}>
                                    {rating}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 'discount':
                return (
                    <View style={styles.optionsContainer}>
                        {DISCOUNTS.map(discount => (
                            <TouchableOpacity
                                key={discount}
                                style={styles.checkboxOption}
                                onPress={() => toggleFilter('discounts', discount)}
                            >
                                <View style={[styles.checkbox, tempFilters.discounts.includes(discount) && styles.checkboxSelected]}>
                                    {tempFilters.discounts.includes(discount) && <Ionicons name="checkmark" size={14} color="#000" />}
                                </View>
                                <Text style={[styles.optionLabel, tempFilters.discounts.includes(discount) && styles.optionLabelSelected]}>
                                    {discount}
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
        tempFilters.ratings.length +
        tempFilters.discounts.length;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Filters</Text>
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear All</Text>
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
                <View style={styles.footerContainer}>
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
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    filterCountContainer: {
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    filterCountText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.tint
    },
    footerButtons: {
        flexDirection: 'row',
        padding: 15,
        gap: 15,
    },
    // ... rest of header/body styles ...
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.tint,
    },
    body: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: '35%',
        backgroundColor: '#f8f9fa',
        borderRightWidth: 1,
        borderRightColor: '#eee',
    },
    sidebarItem: {
        paddingVertical: 20,
        paddingHorizontal: 15,
        position: 'relative',
    },
    sidebarItemActive: {
        backgroundColor: '#fff',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: Colors.light.tint,
    },
    sidebarText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    sidebarTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
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
        marginBottom: 5,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: Colors.light.tint,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.light.tint,
    },
    // Checkbox Option
    checkboxOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 5,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        borderColor: Colors.light.tint,
        // backgroundColor: Colors.light.tint, // Design might not fill it, just checkmark. Let's keep white bg with checkmark for now.
    },
    optionLabel: {
        fontSize: 14,
        color: '#333',
    },
    optionLabelSelected: {
        fontWeight: '600',
        color: '#000',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        marginTop: 10,
    },
    closeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    applyButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: Colors.light.tint,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
});
