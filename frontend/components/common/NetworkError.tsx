import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NetworkErrorProps {
    message?: string;
    onRetry?: () => void;
}

export default function NetworkError({
    message = 'Network error. Please check your connection and try again.',
    onRetry,
}: NetworkErrorProps) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Feather name="wifi-off" size={48} color="#F44336" />
            </View>
            <Text style={styles.title}>Connection Error</Text>
            <Text style={styles.message}>{message}</Text>
            {onRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <Feather name="refresh-cw" size={18} color="#fff" style={styles.retryIcon} />
                    <Text style={styles.retryText}>Retry</Text>
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
        backgroundColor: '#FAFAFA',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#424242',
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        color: '#757575',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    retryButton: {
        flexDirection: 'row',
        backgroundColor: '#FFC107',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FFC107',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    retryIcon: {
        marginRight: 8,
        color: '#000',
    },
    retryText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
});
