import React from 'react';
import { StyleSheet, View } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface ProductSkeletonProps {
    variant?: 'list' | 'grid';
}

export default function ProductSkeleton({ variant = 'grid' }: ProductSkeletonProps) {
    if (variant === 'list') {
        return (
            <View style={styles.listContainer}>
                <SkeletonLoader width={80} height={80} borderRadius={12} />
                <View style={styles.listDetails}>
                    <SkeletonLoader width="70%" height={16} />
                    <View style={{ height: 8 }} />
                    <SkeletonLoader width="40%" height={14} />
                    <View style={{ height: 8 }} />
                    <SkeletonLoader width="30%" height={18} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.gridContainer}>
            <SkeletonLoader width="100%" height={180} borderRadius={15} />
            <View style={{ height: 10 }} />
            <SkeletonLoader width="80%" height={14} />
            <View style={{ height: 6 }} />
            <SkeletonLoader width="50%" height={16} />
        </View>
    );
}

const styles = StyleSheet.create({
    gridContainer: {
        width: 140,
        marginRight: 15,
    },
    listContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
    },
    listDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
});
