import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
    icon?: keyof typeof Feather.glyphMap;
    title: string;
    message?: string;
    actionText?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon = 'inbox',
    title,
    message,
    actionText,
    onAction,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Feather name={icon} size={64} color="#BDBDBD" />
            </View>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            {actionText && onAction && (
                <TouchableOpacity style={styles.button} onPress={onAction}>
                    <Text style={styles.buttonText}>{actionText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 60,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#424242',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#757575',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#FFC107',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
    },
});
