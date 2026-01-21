import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileOptionProps {
    label: string;
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
    isDestructive?: boolean;
    showBorder?: boolean;
}

export default function ProfileOption({
    label,
    icon,
    onPress,
    isDestructive = false,
    showBorder = true
}: ProfileOptionProps) {
    return (
        <TouchableOpacity
            style={[styles.container, showBorder && styles.borderBottom]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, isDestructive && styles.destructiveIconContainer]}>
                <Feather
                    name={icon}
                    size={20}
                    color={isDestructive ? '#EF4444' : '#555'}
                />
            </View>
            <Text style={[styles.label, isDestructive && styles.destructiveLabel]}>
                {label}
            </Text>
            {!isDestructive && (
                <Feather name="chevron-right" size={20} color="#ccc" />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    destructiveIconContainer: {
        backgroundColor: '#FEE2E2',
    },
    label: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    destructiveLabel: {
        color: '#EF4444',
    },
});
