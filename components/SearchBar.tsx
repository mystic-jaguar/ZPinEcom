import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface SearchBarProps {
    placeholder?: string;
}

export default function SearchBar({ placeholder = "Search fashion, trends, styles..." }: SearchBarProps) {
    return (
        <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
                <Feather name="search" size={20} color="#999" testID="search-icon" />
                <TextInput
                    style={styles.searchInput}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                />
                {/* Microphone icon - could be interactive */}
                <Feather name="mic" size={20} color="#FBBF24" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#fff'
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F7F7',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 45,
        borderWidth: 1,
        borderColor: '#EEEEEE'
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        fontSize: 14,
        color: '#333',
    },
});
