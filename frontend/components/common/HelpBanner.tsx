import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HelpBannerProps {
    title?: string;
    subtitle?: string;
    onPress?: () => void;
}

export default function HelpBanner({
    title = 'Need more help?',
    subtitle = 'Chat with our support team',
    onPress
}: HelpBannerProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.iconBg}>
                <Feather name="headphones" size={24} color="#1a1a1a" />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFBEB', // Amber-50 (Light yellow)
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FDE047', // Yellow-300
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
});
