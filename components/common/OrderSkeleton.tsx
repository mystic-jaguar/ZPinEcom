import React from 'react';
import { StyleSheet, View } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

export default function OrderSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <SkeletonLoader width={120} height={14} />
                    <View style={{ height: 6 }} />
                    <SkeletonLoader width={80} height={12} />
                </View>
                <SkeletonLoader width={70} height={24} borderRadius={12} />
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.itemsRow}>
                <SkeletonLoader width={60} height={60} borderRadius={8} />
                <SkeletonLoader width={60} height={60} borderRadius={8} style={{ marginLeft: 8 }} />
                <SkeletonLoader width={60} height={60} borderRadius={8} style={{ marginLeft: 8 }} />
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.footer}>
                <SkeletonLoader width="48%" height={40} borderRadius={8} />
                <SkeletonLoader width="48%" height={40} borderRadius={8} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemsRow: {
        flexDirection: 'row',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});
