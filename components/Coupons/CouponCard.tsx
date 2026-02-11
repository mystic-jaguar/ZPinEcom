import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type CouponStatus = 'active' | 'used' | 'expired';
export type CouponType = 'Fashion' | 'Footwear' | 'Beauty' | 'Free Shipping';

interface CouponCardProps {
    title: string;
    discount: string;
    description: string;
    code: string;
    expiry: string;
    type: CouponType;
    status: CouponStatus;
}

export default function CouponCard({
    title,
    discount,
    description,
    code,
    expiry,
    type,
    status
}: CouponCardProps) {
    const isExpiredOrUsed = status === 'expired' || status === 'used';

    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopyCode = async () => {
        await Clipboard.setStringAsync(code);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    const renderButton = () => {
        if (status === 'used') {
            return (
                <View style={[styles.button, styles.usedButton]}>
                    <Text style={styles.usedButtonText}>Used</Text>
                </View>
            );
        }

        if (status === 'expired') {
            return null;
        }

        // Active state
        return (
            <TouchableOpacity
                style={[styles.button, styles.copyButton, isCopied && styles.copiedButton]}
                onPress={handleCopyCode}
                disabled={isCopied}
            >
                <Feather
                    name={isCopied ? "check" : "copy"}
                    size={18}
                    color="#1A1A1A"
                    style={{ marginRight: 8 }}
                />
                <Text style={styles.copyButtonText}>{isCopied ? "Copied!" : "Copy Code"}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, isExpiredOrUsed && styles.containerDisabled]}>
            {/* Left Color Bar */}
            <View style={[styles.leftBar, isExpiredOrUsed && styles.leftBarDisabled]} />

            <View style={styles.contentContainer}>
                {/* Top Row: Badge & Expiry */}
                <View style={styles.headerRow}>
                    <View style={[styles.badge, isExpiredOrUsed && styles.badgeDisabled]}>
                        <Text style={styles.badgeText}>{type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.expiryContainer}>
                        {status === 'used' && <View style={styles.usedBadge}><Text style={styles.usedBadgeText}>Used</Text></View>}
                        <Text style={styles.expiryText}>{status === 'expired' ? `Exp: ${expiry}` : `Exp: ${expiry}`}</Text>
                    </View>
                </View>

                {/* Discount & Description */}
                <View style={styles.infoSection}>
                    <Text style={[styles.discountText, isExpiredOrUsed && styles.textDisabled]}>
                        {discount} <Text style={styles.offText}>OFF</Text>
                    </Text>
                    <Text style={[styles.descriptionText, isExpiredOrUsed && styles.textDisabled]}>
                        {description}
                    </Text>
                </View>

                {/* Divider with Cutouts */}
                <View style={styles.dividerContainer}>
                    <View style={styles.circleLeft} />
                    <View style={styles.dashedLine} />
                    <View style={styles.circleRight} />
                </View>

                {/* Bottom Section: Code & Action */}
                <View style={styles.bottomSection}>
                    <Text style={styles.codeLabel}>CODE</Text>
                    <View style={styles.codeContainer}>
                        <Text style={[styles.codeText, isExpiredOrUsed && styles.textDisabled]}>{code}</Text>
                    </View>

                    {renderButton()}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginVertical: 10,
        marginHorizontal: 20,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    containerDisabled: {
        opacity: 0.7,
    },
    leftBar: {
        width: 8,
        backgroundColor: '#FFD700',
        height: '100%',
    },
    leftBarDisabled: {
        backgroundColor: '#E5E7EB',
    },
    contentContainer: {
        flex: 1,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#FEF9C3', // Light yellow
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeDisabled: {
        backgroundColor: '#F3F4F6',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#854D0E',
        letterSpacing: 0.5,
    },
    expiryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    expiryText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    usedBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    usedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
    },
    infoSection: {
        marginBottom: 20,
    },
    discountText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    offText: {
        fontSize: 20,
        fontWeight: '600',
    },
    descriptionText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    textDisabled: {
        color: '#9CA3AF',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: -20, // Extend beyond padding
        marginBottom: 20,
        position: 'relative',
        height: 20,
    },
    dashedLine: {
        height: 1,
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 1,
    },
    circleLeft: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F8F9FA', // Match screen background
        position: 'absolute',
        left: -10, // Half width
        zIndex: 1,
    },
    circleRight: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F8F9FA', // Match screen background
        position: 'absolute',
        right: -10, // Half width
        zIndex: 1,
    },
    bottomSection: {
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginBottom: 8,
    },
    codeContainer: {
        width: '100%',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    codeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: 0.5,
    },
    button: {
        width: '100%',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyButton: {
        backgroundColor: '#FFD700',
    },
    copyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    usedButton: {
        backgroundColor: '#E5E7EB',
    },
    usedButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#9CA3AF',
    },
    copiedButton: {
        backgroundColor: '#4ade80', // Green-400
    },
});
