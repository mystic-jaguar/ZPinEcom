import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';

const { width } = Dimensions.get('window');

const CATEGORIES_GRID = [
    { id: '1', name: 'Men', image: require('../../assets/images/men_icon.jpg') },
    { id: '2', name: 'Women', image: require('../../assets/images/women_icon.jpg') },
    { id: '3', name: 'Kids', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=300&q=80' },
    { id: '4', name: 'Makeup', image: require('../../assets/images/makeup_icon.jpg') },
    { id: '5', name: 'Home', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80' },
    { id: '6', name: 'Electronics', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=300&q=80' },
    { id: '7', name: 'Gen-Z', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80' },
    { id: '8', name: 'Footwear', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=300&q=80' },
];

export default function CategoriesScreen() {
    return (
        <SafeAreaView style={styles.container}>
            {/* Explicit Header reuse */}
            <Header />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <SearchBar placeholder="Search brands, trends, styles..." />

                <View style={styles.titleContainer}>
                    <Text style={styles.pageTitle}>Shop Categories</Text>
                    <Text style={styles.pageSubtitle}>Explore the latest collections near you</Text>
                </View>

                <View style={styles.gridContainer}>
                    {CATEGORIES_GRID.map((item) => (
                        <View key={item.id} style={styles.gridItem}>
                            <View style={styles.imageContainer}>
                                <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.gridImage} resizeMode="cover" />
                            </View>
                            <Text style={styles.gridLabel}>{item.name}</Text>
                        </View>
                    ))}
                </View>

                {/* Bottom Banner */}
                <View style={styles.bannerContainer}>
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerLabel}>EXCLUSIVE OFFER</Text>
                        <Text style={styles.bannerTitle}>Fashion at</Text>
                        <Text style={styles.bannerTitle}>Lightning Speed</Text>
                        <Text style={styles.bannerDesc}>Get deliveries in 2-12 hours.</Text>

                        <View style={styles.shopNowButton}>
                            <Text style={styles.shopNowText}>Shop Now</Text>
                        </View>
                    </View>
                    <View style={styles.boltIcon}>
                        <Feather name="zap" size={60} color="rgba(255,255,255,0.4)" />
                    </View>
                </View>

                {/* Spacer for bottom tab bar */}
                <View style={{ height: 20 }} />
            </ScrollView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 20
    },
    titleContainer: {
        paddingHorizontal: 20,
        marginBottom: 20
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 5
    },
    pageSubtitle: {
        fontSize: 14,
        color: '#666'
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    gridItem: {
        width: (width - 50) / 2, // 2 columns with spacing
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        marginBottom: 20,
        alignItems: 'center',
        paddingBottom: 15,
        overflow: 'hidden'
    },
    imageContainer: {
        width: '100%',
        height: 150,
        backgroundColor: '#eee',
        marginBottom: 10
    },
    gridImage: {
        width: '100%',
        height: '100%'
    },
    gridLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a'
    },
    bannerContainer: {
        marginHorizontal: 20,
        backgroundColor: '#FBBF24',
        borderRadius: 20,
        padding: 24,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
        height: 180
    },
    bannerContent: {
        flex: 1,
        zIndex: 2
    },
    bannerLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 5,
        opacity: 0.8
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        lineHeight: 26
    },
    bannerDesc: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
        marginBottom: 15,
        opacity: 0.9
    },
    shopNowButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        alignSelf: 'flex-start'
    },
    shopNowText: {
        fontWeight: '700',
        color: '#FBBF24',
        fontSize: 12
    },
    boltIcon: {
        position: 'absolute',
        right: -10,
        bottom: -10,
        transform: [{ rotate: '-15deg' }]
    }
});
