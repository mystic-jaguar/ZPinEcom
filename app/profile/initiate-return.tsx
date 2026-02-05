import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRODUCTS } from '../../constants/products';

export default function InitiateReturnScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { productId, orderId } = params;

    const productData = PRODUCTS.find(p => p.id === productId);

    // Fallback data if params are missing (for dev/preview) or product found
    const product = {
        name: productData?.name || params.name || 'Quilted Bomber Jacket',
        variant: productData?.subtitle || params.variant || 'Size: L • Color: Olive Green',
        orderId: orderId || params.orderId || '#ZP-98231',
        image: productData?.image || (params.image ? { uri: params.image } : require('../../assets/images/handbags.jpg')),
    };

    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [comments, setComments] = useState('');

    const reasons = [
        'Size too large',
        'Item damaged',
        'Different from image',
        'Instant Trial – Not purchased'
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Initiate Return</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Product Card */}
                <View style={styles.productCard}>
                    <Image source={product.image} style={styles.productImage} />
                    <View style={styles.productInfo}>
                        <View style={styles.tagContainer}>
                            <Text style={styles.returnTag}>RETURN ITEM</Text>
                        </View>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productVariant}>{product.variant}</Text>
                        <Text style={styles.orderId}>ORDER ID: {product.orderId}</Text>
                    </View>
                </View>

                {/* Reason for Return */}
                <View style={[styles.section, { marginTop: 24 }]}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Reason for Return</Text>
                        <Text style={styles.requiredText}>REQUIRED</Text>
                    </View>

                    <View style={styles.reasonsContainer}>
                        {reasons.map((reason, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.reasonOption}
                                onPress={() => setSelectedReason(reason)}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <View style={[
                                    styles.radioOuter,
                                    selectedReason === reason && styles.radioOuterSelected
                                ]}>
                                    {selectedReason === reason && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Additional Comments */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Comments</Text>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Tell us more about the issue..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={comments}
                        onChangeText={setComments}
                    />
                </View>

                {/* Add Photos */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Add Photos</Text>
                        <Text style={styles.photoCount}>0/3</Text>
                    </View>

                    <View style={styles.photosRow}>
                        <TouchableOpacity style={styles.uploadBox}>
                            <Feather name="camera" size={24} color="#6B7280" />
                            <Text style={styles.uploadText}>UPLOAD</Text>
                        </TouchableOpacity>

                        {/* Example of what an uploaded photo might look like (placeholder) */}
                        <View style={styles.photoThumbnail}>
                            <Image source={product.image} style={styles.thumbImage} />
                            <View style={styles.checkBadge}>
                                <Feather name="check" size={12} color="#fff" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Info Note */}
                <View style={styles.infoBox}>
                    <Feather name="info" size={18} color="#92400E" style={{ marginTop: 2 }} />
                    <Text style={styles.infoText}>
                        Please upload clear photos showing the tags and the specific defect (if applicable).
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitBtn}>
                    <Text style={styles.submitBtnText}>SUBMIT RETURN REQUEST</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        padding: 5,
        marginLeft: -5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    scrollContent: {
        padding: 20,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    productInfo: {
        flex: 1,
        marginLeft: 16,
    },
    tagContainer: {
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    returnTag: {
        color: '#FBBF24',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    productName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    productVariant: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    orderId: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    requiredText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
    },
    reasonsContainer: {
        gap: 12,
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
    },
    reasonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: '#FBBF24', // Use brand primary color or similar
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FBBF24', // Gradient/Gold look in design, using solid for now
    },
    commentInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        fontSize: 14,
        color: '#1a1a1a',
        minHeight: 120,
    },
    photoCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    photosRow: {
        flexDirection: 'row',
        gap: 12,
    },
    uploadBox: {
        width: 80,
        height: 80,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    uploadText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 4,
    },
    photoThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    checkBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -10,
        marginLeft: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', // Or white circle
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    submitBtn: {
        backgroundColor: '#FBBF24',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
