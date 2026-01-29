import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DeliveryOptionSelectorProps {
    selectedOption: 'instant' | 'standard';
    onSelect: (option: 'instant' | 'standard') => void;
}

export default function DeliveryOptionSelector({ selectedOption, onSelect }: DeliveryOptionSelectorProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.optionButton,
                    selectedOption === 'instant' ? styles.selectedOption : styles.unselectedOption
                ]}
                onPress={() => onSelect('instant')}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.optionText,
                    selectedOption === 'instant' ? styles.selectedText : styles.unselectedText
                ]}>
                    Instant Trial
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.optionButton,
                    selectedOption === 'standard' ? styles.selectedOption : styles.unselectedOption
                ]}
                onPress={() => onSelect('standard')}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.optionText,
                    selectedOption === 'standard' ? styles.selectedText : styles.unselectedText
                ]}>
                    Standard Delivery
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16
    },
    optionButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8
    },
    selectedOption: {
        backgroundColor: '#FBBF24',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    unselectedOption: {
        backgroundColor: 'transparent'
    },
    optionText: {
        fontSize: 13,
        fontWeight: '700'
    },
    selectedText: {
        color: '#1a1a1a'
    },
    unselectedText: {
        color: '#666'
    }
});
