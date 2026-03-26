import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface OrderFiltersProps {
    selectedFilter: string;
    onSelectFilter: (filter: string) => void;
}

const FILTERS = ['All', 'In Progress', 'Completed', 'Cancelled'];

export default function OrderFilters({ selectedFilter, onSelectFilter }: OrderFiltersProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {FILTERS.map((filter) => (
                <TouchableOpacity
                    key={filter}
                    style={[
                        styles.chip,
                        selectedFilter === filter && styles.selectedChip,
                    ]}
                    onPress={() => onSelectFilter(filter)}
                >
                    <Text
                        style={[
                            styles.chipText,
                            selectedFilter === filter && styles.selectedChipText,
                        ]}
                    >
                        {filter}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    selectedChip: {
        backgroundColor: '#FBBF24',
        borderColor: '#FBBF24',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    selectedChipText: {
        color: '#1a1a1a',
        fontWeight: '600',
    },
});
