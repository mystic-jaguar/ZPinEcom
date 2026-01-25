import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchBarProps {
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    onPress?: () => void;
    editable?: boolean;
    autoFocus?: boolean;
}

export default function SearchBar({
    placeholder = "Search fashion, trends, styles...",
    value,
    onChangeText,
    onPress,
    editable = true,
    autoFocus = false
}: SearchBarProps) {
    const Container = editable ? View : TouchableOpacity;

    return (
        <View style={styles.searchContainer}>
            <Container
                style={styles.searchBar}
                onPress={!editable ? onPress : undefined}
                activeOpacity={!editable ? 0.7 : 1}
            >
                <Feather name="search" size={20} color="#999" testID="search-icon" />
                <TextInput
                    style={styles.searchInput}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChangeText}
                    editable={editable}
                    autoFocus={autoFocus}
                    pointerEvents={editable ? 'auto' : 'none'}
                />
            </Container>
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
