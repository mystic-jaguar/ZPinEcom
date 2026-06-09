import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

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
                {editable && value && value.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeText?.('')} style={{ padding: 4 }}>
                        <Feather name="x-circle" size={18} color="#999" />
                    </TouchableOpacity>
                )}
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        paddingHorizontal: '5%',
        paddingBottom: '4%',
        backgroundColor: '#fff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F7F7',
        borderRadius: 25,
        paddingHorizontal: '4%',
        height: width * 0.112,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    searchInput: {
        flex: 1,
        marginLeft: '2.5%',
        marginRight: '2.5%',
        fontSize: width * 0.035,
        color: '#333',
    },
});
