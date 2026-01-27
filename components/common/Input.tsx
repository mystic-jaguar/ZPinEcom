import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface InputProps extends TextInputProps {
    label: string;
    error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    error ? styles.errorInput : null,
                    style
                ]}
                placeholderTextColor="#999"
                {...props}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12, // Comfortable height for touch
        fontSize: 16,
        color: '#1a1a1a'
    },
    errorInput: {
        borderColor: '#EF4444'
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4
    }
});
