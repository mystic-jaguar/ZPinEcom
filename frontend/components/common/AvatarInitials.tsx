import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AvatarInitialsProps {
    name: string;
    size?: number;
    fontSize?: number;
    borderWidth?: number;
    borderColor?: string;
    profileImage?: string | null;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AvatarInitials({
    name,
    size = 80,
    fontSize,
    borderWidth = 3,
    borderColor = '#fff',
    profileImage,
}: AvatarInitialsProps) {
    const initials = getInitials(name);
    const computedFontSize = fontSize ?? Math.floor(size * 0.35);

    return (
        <View style={[
            styles.circle,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth,
                borderColor,
                overflow: 'hidden', // Ensures the image respects the border radius
            }
        ]}>
            {profileImage ? (
                <Image
                    source={{ uri: profileImage }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                />
            ) : (
                <Text style={[styles.text, { fontSize: computedFontSize }]}>
                    {initials}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#1a1a1a',
        fontWeight: '800',
        letterSpacing: 1,
    },
});
