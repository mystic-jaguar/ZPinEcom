import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionModalProps {
    visible: boolean;
    title: string;
    message: string;
    primaryButtonText: string;
    onPrimaryPress: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
    onClose: () => void;
    icon?: keyof typeof Feather.glyphMap;
}

export default function ActionModal({
    visible,
    title,
    message,
    primaryButtonText,
    onPrimaryPress,
    secondaryButtonText,
    onSecondaryPress,
    onClose,
    icon = 'check-circle'
}: ActionModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <Feather name={icon} size={32} color="#FBBF24" />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryPress}>
                            <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                        </TouchableOpacity>

                        {secondaryButtonText && onSecondaryPress && (
                            <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryPress}>
                                <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFBE6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20
    },
    buttonContainer: {
        width: '100%',
        gap: 12
    },
    primaryButton: {
        backgroundColor: '#FBBF24',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%'
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a'
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a'
    }
});
