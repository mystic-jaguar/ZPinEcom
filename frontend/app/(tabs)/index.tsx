import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Dimensions, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import LegalDocModal, { LegalDocType } from '../../components/common/LegalDocModal';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../context/SearchContext';
import { productService } from '../../services/product';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'fashion', name: 'Fashion', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=200&q=80' },
    { id: 'footwear', name: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80' },
    { id: 'accessories', name: 'Accessories', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=200&q=80' },
    { id: 'beauty', name: 'Beauty', image: require('../../assets/images/beauty_icon.jpg') },
    { id: 'home', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=200&q=80' },
];

const RECOMMENDED = [
    { id: '1', name: 'Bags', desc: 'Starting from ₹499', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Bags' },
    { id: '2', name: 'Headphones', desc: 'Up to 60% OFF', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80', category: 'Gadgets', subCategory: 'Audio Devices' },
    { id: '3', name: 'Watches', desc: 'Min 40% OFF', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Watches' },
    { id: '4', name: 'Sunglasses', desc: 'Stylish & Cool', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Sunglasses' },
    { id: '5', name: 'Wallets', desc: 'Premium Leather', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Wallets' },
];

const FRESH_ARRIVALS = [
    { id: '1', name: 'Ethnic Wear', offer: '30% - 70% OFF', image: require('../../assets/images/ethnic_wear_icon.jpg'), color: '#6A994E', category: 'Fashion', subCategory: 'Ethnic' },
    { id: '2', name: 'Casual Wear', offer: '20% - 60% OFF', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80', color: '#E9E3D5', category: 'Fashion', subCategory: 'T-Shirts' },
    { id: '3', name: 'Western', offer: 'FLAT 50% OFF', image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=400&q=80', color: '#D4A373', category: 'Fashion', subCategory: 'Western' },
];

const NEARBY_FALLBACK = [
    { id: '1', name: 'Men',    image: require('../../assets/images/men_icon.jpg'),    category: 'Fashion', subCategory: 'Men',    count: null as number | null },
    { id: '2', name: 'Women',  image: require('../../assets/images/women_icon.jpg'),  category: 'Fashion', subCategory: 'Women',  count: null as number | null },
    { id: '3', name: 'Kids',   image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=200&q=80', category: 'Fashion', subCategory: 'Kids', count: 0 as number | null },
    { id: '4', name: 'Makeup', image: require('../../assets/images/makeup_icon.jpg'), category: 'Beauty',  subCategory: 'Makeup', count: null as number | null },
];

const BIG_DISCOUNTS = [
    { id: '1', name: 'Sneaker Steals', desc: "Grab a pair before it's gone!", image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80', category: 'Footwear', subCategory: 'Sports Shoes' },
    { id: '2', name: 'Winter Clearance', desc: 'Up to 80% off jackets', image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=400&q=80', category: 'Fashion', subCategory: 'Jackets' },
];

export default function HomeScreen() {
    const router = useRouter();
    const { recentSearches } = useSearch();
    const [freshArrivals, setFreshArrivals] = useState<any[]>(FRESH_ARRIVALS);
    const [recommended, setRecommended] = useState<any[]>(RECOMMENDED);
    const [nearby, setNearby] = useState<any[]>(NEARBY_FALLBACK);
    const [locationLabel, setLocationLabel] = useState<string>('Your Area');
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const appState = useRef(AppState.currentState);
    const awaitingSettingsReturn = useRef(false);

    const openLegalDoc = (type: LegalDocType) => {
        setLegalDocType(type);
        setLegalModalVisible(true);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        const { status } = await ExpoLocation.getForegroundPermissionsAsync();
        if (status === 'granted') {
            setLocationGranted(true);
            try {
                const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
                await fetchProducts(loc.coords.latitude, loc.coords.longitude);
            } catch {
                await fetchProducts();
            }
        } else {
            await fetchProducts();
        }
        setRefreshing(false);
    };

    useEffect(() => {
        // Check current permission status first — only show pre-prompt if undetermined
        ExpoLocation.getForegroundPermissionsAsync().then(({ status }) => {
            if (status === 'granted') {
                // Already granted — fetch directly
                requestLocationAndFetch();
            } else if (status === 'undetermined') {
                // Show our explanation modal before the native dialog
                setShowLocationModal(true);
            } else {
                // Denied — skip location, just fetch products
                setLocationGranted(false);
                fetchProducts();
            }
        });
    }, []);

    // Re-check permission when user returns from system settings
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                if (awaitingSettingsReturn.current) {
                    awaitingSettingsReturn.current = false;
                    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
                    if (status === 'granted') {
                        setLocationGranted(true);
                        setShowLocationModal(false);
                        requestLocationAndFetch();
                    } else {
                        setLocationGranted(false);
                        fetchProducts();
                    }
                }
            }
            appState.current = nextState;
        });
        return () => subscription.remove();
    }, []);

    const requestLocationAndFetch = async () => {
        let lat: number | undefined;
        let lng: number | undefined;

        try {
            // Check current status first — if denied, we can't re-prompt, must open settings
            const { status: currentStatus } = await ExpoLocation.getForegroundPermissionsAsync();

            if (currentStatus === 'denied') {
                // Already denied — open system settings so user can manually grant
                setLocationGranted(false);
                awaitingSettingsReturn.current = true;
                await Linking.openSettings();
                // AppState listener will handle the re-check when app comes back
                return;
            }

            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            setLocationGranted(status === 'granted');

            if (status === 'granted') {
                const loc = await ExpoLocation.getCurrentPositionAsync({
                    accuracy: ExpoLocation.Accuracy.Balanced,
                });
                lat = loc.coords.latitude;
                lng = loc.coords.longitude;

                const [place] = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (place) {
                    const label = place.district || place.subregion || place.city || place.region || 'Your Area';
                    setLocationLabel(label);
                }
            }
        } catch {
            // Location failed — proceed without it
        }

        await fetchProducts(lat, lng);
    };

    const fetchProducts = async (lat?: number, lng?: number) => {
        if (isLoadingProducts) return;
        setIsLoadingProducts(true);
        setError(null);

        try {
            // Fire all 3 requests in parallel — eliminates sequential blocking
            const [freshCats, recProducts, nearbyData] = await Promise.allSettled([
                productService.getFreshCategories(),
                productService.getRecommended(recentSearches, 8),
                productService.getNearbyCategories(lat, lng),
            ]);

            if (freshCats.status === 'fulfilled' && freshCats.value.length > 0) {
                const CARD_COLORS = ['#E9E3D5', '#D4E6D5', '#D4D6E6', '#E6D4D4', '#E6E4D4'];
                setFreshArrivals(freshCats.value.map((cat, i) => {
                    const pathArr = Array.isArray(cat.categoryPath) ? cat.categoryPath : [];
                    const rootCat = pathArr[0]?.name || cat.name;
                    return {
                        id: String(i),
                        name: cat.name,
                        offer: 'New Arrival',
                        image: cat.imageUrl ? { uri: cat.imageUrl } : require('../../assets/images/icon_backup.png'),
                        color: CARD_COLORS[i % CARD_COLORS.length],
                        category: rootCat,
                        subCategory: cat.name,
                    };
                }));
            }

            if (recProducts.status === 'fulfilled' && recProducts.value.length > 0) {
                setRecommended(recProducts.value.map(p => ({
                    id: p.productId,
                    name: p.productName,
                    desc: `₹${p.price}`,
                    image: p.images?.length > 0 ? p.images[0] : 'https://via.placeholder.com/150',
                    category: Array.isArray(p.categoryPath) ? (p.categoryPath[0]?.name || 'Fashion') : p.categoryPath,
                    subCategory: p.deepestCategoryName || '',
                })));
            }

            if (nearbyData.status === 'fulfilled' && nearbyData.value.length > 0) {
                setNearby(nearbyData.value.map((cat, i) => ({
                    id: String(i),
                    name: cat.name,
                    image: cat.imageUrl
                        ? { uri: cat.imageUrl }
                        : NEARBY_FALLBACK.find(n => n.name === cat.name)?.image || require('../../assets/images/icon_backup.png'),
                    category: cat.rootCategory,
                    subCategory: cat.subCategory,
                    count: cat.count,
                })));
            }
        } catch (error) {
            console.error('Error fetching home products:', error);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const hasMountedRef = useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (!hasMountedRef.current) {
                hasMountedRef.current = true;
                return;
            }
            onRefresh();
        }, [])
    );

    const handleProductNav = (category: string, subCategory?: string) => {
        router.push({
            pathname: '/product-listing',
            params: { categoryName: category, subCategoryName: subCategory },
        });
    };

    const handleNearbyNav = (item: any) => {
        if (item.count != null && item.count <= 0) {
            Alert.alert('Coming Soon', `${item.name} products will be available in your area soon!`);
            return;
        }
        handleProductNav(item.category, item.subCategory);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header />

            {/* Location pre-prompt — shown before native OS dialog */}
            <ActionModal
                visible={showLocationModal}
                icon="map-pin"
                title="Enable Location"
                message="ZPIN uses your location to show nearby product availability in your area."
                primaryButtonText="Allow Location"
                onPrimaryPress={async () => {
                    setShowLocationModal(false);
                    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
                    if (status === 'denied') {
                        // Already denied — go straight to settings
                        awaitingSettingsReturn.current = true;
                        await Linking.openSettings();
                        // AppState listener will handle re-check when app returns
                    } else {
                        requestLocationAndFetch();
                    }
                }}
                secondaryButtonText="Skip"
                onSecondaryPress={() => {
                    setShowLocationModal(false);
                    setLocationGranted(false);
                    fetchProducts();
                }}
                onClose={() => {
                    setShowLocationModal(false);
                    setLocationGranted(false);
                    fetchProducts();
                }}
            />

            {/* Contact Modal */}
            <ActionModal
                visible={contactModalVisible}
                icon="phone"
                title="Contact Us"
                message="How would you like to reach us?"
                primaryButtonText="Call Us"
                onPrimaryPress={() => {
                    setContactModalVisible(false);
                    Linking.openURL('tel:8789582754');
                }}
                secondaryButtonText="Email Us"
                onSecondaryPress={() => {
                    setContactModalVisible(false);
                    Linking.openURL('mailto:zpinpvtltd@gmail.com?subject=Contact Zpin');
                }}
                onClose={() => setContactModalVisible(false)}
            />

            {/* Legal Document Modal */}
            <LegalDocModal
                visible={legalModalVisible}
                docType={legalDocType}
                onClose={() => setLegalModalVisible(false)}
            />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FBBF24']}
                        tintColor="#FBBF24"
                    />
                }
            >

                <SearchBar
                    editable={false}
                    onPress={() => router.push('/product-search')}
                    placeholder="Search products..."
                />

                {/* Categories Carousel */}
                <View style={styles.categoriesWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer} contentContainerStyle={styles.categoriesContent}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={styles.categoryItem}
                                onPress={() => router.push({ pathname: '/(tabs)/categories', params: { categoryId: cat.id } })}
                            >
                                <View style={styles.categoryImageContainer}>
                                    <Image source={typeof cat.image === 'string' ? { uri: cat.image } : cat.image} style={styles.categoryImage} />
                                </View>
                                <Text style={styles.categoryText} numberOfLines={2}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {/* Fade indicator hinting more content to the right */}
                    <View style={styles.categoriesFadeRight} pointerEvents="none">
                        <LinearGradient
                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', '#ffffff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.categoriesFadeGradient}
                        />
                    </View>
                </View>

                {/* Hero */}
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>Fashion at</Text>
                        <Text style={[styles.heroTitle, styles.heroTitleItalic]}>Lightning</Text>
                        <Text style={[styles.heroTitle, styles.heroTitleItalic]}>Speed</Text>
                        <Text style={styles.heroSubtitle}>Get your favorite styles delivered in just 2-12 hours. Fast, trendy, and always fresh.</Text>
                        <View style={styles.heroStats}>
                            <View>
                                <Text style={styles.heroStatValue}>2-12</Text>
                                <Text style={styles.heroStatLabel}>HOURS</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View>
                                <Text style={styles.heroStatValue}>50K+</Text>
                                <Text style={styles.heroStatLabel}>PRODUCTS</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/product-listing')}>
                            <Text style={styles.heroButtonText}>Shop Latest Looks</Text>
                            <Feather name="arrow-right" size={16} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.heroImageContainer}>
                        <Image source={{ uri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80' }} style={styles.heroImage} />
                        <View style={styles.priceTag}>
                            <Text style={styles.priceTagText}>PREMIUM</Text>
                            <Text style={styles.priceTagPrice}>₹2,999</Text>
                        </View>
                    </View>
                </View>

                {/* Promo Banner */}
                <View style={styles.promoBannerContainer}>
                    <LinearGradient colors={['#667db6', '#0082c8', '#0082c8', '#667db6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.promoBanner}>
                        <View style={styles.promoContent}>
                            <Text style={styles.promoLabel}>LIMITED TIME</Text>
                            <Text style={styles.promoTitle}>DRESS FEST</Text>
                            <Text style={styles.promoSubtitle}>UP TO 50% OFF</Text>
                            <Text style={styles.promoFooter}>BRIGHTS, PRINTS & MORE</Text>
                            <TouchableOpacity style={styles.promoCta} onPress={() => handleProductNav('Fashion')} activeOpacity={0.85}>
                                <Text style={styles.promoCtaText}>Shop Now</Text>
                                <Feather name="arrow-right" size={12} color="#0082c8" />
                            </TouchableOpacity>
                        </View>
                        <Image source={{ uri: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=300&q=80' }} style={styles.promoImage} />
                    </LinearGradient>
                </View>

                {/* Recommended */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recommended</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                    {recommended.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.recommendCard} onPress={() => handleProductNav(item.category, item.subCategory)}>
                            <View style={styles.recommendImageContainer}>
                                <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.recommendImage} />
                            </View>
                            <Text style={styles.recommendName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.recommendDesc}>{item.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Fresh Arrivals */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Fresh Arrivals</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                    {freshArrivals.map((item) => (
                        <TouchableOpacity key={item.id} style={[styles.freshCard, { backgroundColor: item.color || '#fff' }]} onPress={() => handleProductNav(item.category, item.subCategory)}>
                            <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.freshImage} />
                            <View style={styles.freshInfo}>
                                <Text style={styles.freshName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.freshOffer}>{item.offer}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Nearby Availabilities */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>Nearby Availabilities</Text>
                        {locationGranted && (
                            <Text style={styles.locationLabel}>{locationLabel}</Text>
                        )}
                    </View>
                </View>

                {locationGranted ? (
                    <View style={styles.nearbyGrid}>
                        {nearby.map((item) => (
                            <TouchableOpacity key={item.id} style={[styles.nearbyItem, item.count != null && item.count <= 0 && styles.nearbyItemDisabled]} onPress={() => handleNearbyNav(item)}>
                                <View style={styles.nearbyImageContainer}>
                                    <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.nearbyImage} />
                                    {item.count != null && item.count > 0 && (
                                        <View style={styles.nearbyBadge}>
                                            <Text style={styles.nearbyBadgeText}>{item.count}+</Text>
                                        </View>
                                    )}
                                    {item.count != null && item.count <= 0 && (
                                        <View style={styles.comingSoonOverlay}>
                                            <Text style={styles.comingSoonText}>Coming Soon</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.nearbyName}>{item.name}</Text>
                                {item.count != null && (
                                    <Text style={styles.nearbyCount}>{item.count > 0 ? `${item.count} items` : 'Coming soon'}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.locationDisclaimer}
                        onPress={() => setShowLocationModal(true)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.locationDisclaimerIcon}>
                            <Feather name="map-pin" size={28} color="#FBBF24" />
                        </View>
                        <Text style={styles.locationDisclaimerTitle}>Location Access Required</Text>
                        <Text style={styles.locationDisclaimerText}>
                            Allow location access to discover products available near you.
                        </Text>
                        <View style={styles.locationDisclaimerButton}>
                            <Text style={styles.locationDisclaimerButtonText}>Enable Location</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Big Discounts */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Big Discounts</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                    {BIG_DISCOUNTS.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.discountCard} onPress={() => handleProductNav(item.category, item.subCategory)}>
                            <Image source={{ uri: item.image }} style={styles.discountImage} />
                            <View style={styles.discountOverlay}>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountBadgeText}>Flat 40% OFF</Text>
                                </View>
                            </View>
                            <View style={styles.discountInfo}>
                                <Text style={styles.discountName}>{item.name}</Text>
                                <Text style={styles.discountDesc}>{item.desc}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerLogo}>ZPIN</Text>
                    <Text style={styles.footerTagline}>Style at your door, in just 12 hours. Because waiting is so last season.</Text>
                    <View style={styles.footerLinks}>
                        <Text style={styles.footerLink} onPress={() => setContactModalVisible(true)}>Contact</Text>
                        <Text style={styles.footerLink} onPress={() => router.push('/profile/help-center')}>Help</Text>
                        <Text style={styles.footerLink} onPress={() => openLegalDoc('terms')}>Terms</Text>
                        <Text style={styles.footerLink} onPress={() => openLegalDoc('privacy')}>Privacy</Text>
                    </View>
                    <Text style={styles.copyright}>© 2026 Zpin. All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { paddingBottom: 20 },

    // Categories carousel with fade indicator
    categoriesWrapper: {
        marginBottom: width * 0.05,
        position: 'relative',
    },
    categoriesContainer: { paddingLeft: width * 0.05 },
    categoriesContent: { paddingRight: width * 0.12 },
    categoryItem: { alignItems: 'center', marginRight: width * 0.04, width: width * 0.18 },
    categoryImageContainer: {
        width: width * 0.15,
        height: width * 0.15,
        borderRadius: width * 0.075,
        backgroundColor: '#f5f5f5',
        marginBottom: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    categoryImage: { width: '100%', height: '100%' },
    categoryText: { fontSize: 11, color: '#555', fontWeight: '500', textAlign: 'center', lineHeight: 14 },
    categoriesFadeRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: width * 0.14,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    categoriesFadeGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },

    // Hero
    heroSection: {
        backgroundColor: '#FFFBE6',
        marginHorizontal: width * 0.05,
        borderRadius: 20,
        padding: width * 0.05,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: width * 0.06,
        overflow: 'hidden',
    },
    heroContent: { flex: 1, paddingRight: width * 0.02 },
    heroTitle: { fontSize: width * 0.06, fontWeight: '800', color: '#1A1A1A', lineHeight: width * 0.076 },
    heroTitleItalic: { color: '#FBBF24', fontStyle: 'italic' },
    heroSubtitle: { fontSize: width * 0.03, color: '#666', marginTop: 8, marginBottom: 15, lineHeight: width * 0.042 },
    heroStats: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
    heroStatValue: { fontWeight: '800', fontSize: width * 0.04, color: '#333' },
    heroStatLabel: { fontSize: width * 0.025, color: '#888' },
    heroStatDivider: { width: 1, height: 25, backgroundColor: '#ddd', marginHorizontal: 10 },
    heroButton: {
        backgroundColor: '#FBBF24',
        paddingVertical: width * 0.025,
        paddingHorizontal: width * 0.04,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    heroButtonText: { fontSize: width * 0.03, fontWeight: '700', color: '#1a1a1a', marginRight: 5 },
    heroImageContainer: { width: width * 0.3, height: width * 0.4, borderRadius: 15, overflow: 'hidden' },
    heroImage: { width: '100%', height: '100%' },
    priceTag: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    priceTagText: { color: '#9CA3AF', fontSize: width * 0.022, fontWeight: '700', letterSpacing: 0.5 },
    priceTagPrice: { color: '#1a1a1a', fontWeight: '800', fontSize: width * 0.032 },

    // Promo Banner
    promoBannerContainer: {
        marginHorizontal: width * 0.05,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: width * 0.06,
        height: width * 0.44,
    },
    promoBanner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: width * 0.05 },
    promoContent: { flex: 1 },
    promoLabel: { color: '#fff', fontSize: width * 0.025, letterSpacing: 1, marginBottom: 5 },
    promoTitle: { color: '#fff', fontSize: width * 0.06, fontWeight: '900', fontStyle: 'italic' },
    promoSubtitle: { color: '#fff', fontSize: width * 0.045, fontWeight: '700', marginBottom: 5 },
    promoFooter: { color: '#eee', fontSize: width * 0.025 },
    promoCta: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 10,
    },
    promoCtaText: { color: '#0082c8', fontWeight: '800', fontSize: width * 0.028, marginRight: 4 },
    promoImage: { width: width * 0.3, height: '100%', resizeMode: 'cover', borderTopRightRadius: 20, borderBottomRightRadius: 20, opacity: 0.85 },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: width * 0.05,
        marginBottom: 15,
    },
    sectionTitle: { fontSize: width * 0.045, fontWeight: '800', color: '#1a1a1a' },
    viewAllText: { color: '#FBBF24', fontSize: width * 0.03, fontWeight: '600' },
    locationLabel: { fontSize: width * 0.028, color: '#888', marginTop: 2 },

    // Horizontal lists
    horizontalList: { paddingLeft: width * 0.05, paddingRight: width * 0.025, marginBottom: 20 },

    // Recommended
    recommendCard: { width: width * 0.35, marginRight: width * 0.038 },
    recommendImageContainer: {
        height: width * 0.35,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#AAA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    recommendImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    recommendName: { fontWeight: '700', color: '#333', fontSize: width * 0.035, textAlign: 'center' },
    recommendDesc: { color: '#888', fontSize: width * 0.025, textAlign: 'center' },

    // Fresh Arrivals
    freshCard: { width: width * 0.4, height: width * 0.55, borderRadius: 15, marginRight: width * 0.038, overflow: 'hidden' },
    freshImage: { width: '100%', height: '100%' },
    freshInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
    },
    freshName: { fontWeight: '700', fontSize: width * 0.03, color: '#333', textAlign: 'center' },
    freshOffer: { color: '#666', fontSize: width * 0.025, textAlign: 'center' },

    // Nearby grid
    nearbyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: width * 0.038,
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    nearbyItem: { width: '47%', marginBottom: 15, alignItems: 'center' },
    nearbyImageContainer: {
        width: '100%',
        aspectRatio: 1.4,
        borderRadius: 15,
        backgroundColor: '#f5f5f5',
        marginBottom: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    nearbyImage: { width: '100%', height: '100%' },
    nearbyBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FBBF24',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    nearbyBadgeText: { fontSize: width * 0.025, fontWeight: '800', color: '#1a1a1a' },
    nearbyName: { fontWeight: '600', fontSize: width * 0.035, color: '#333' },
    nearbyCount: { fontSize: width * 0.028, color: '#888', marginTop: 2 },
    nearbyItemDisabled: { opacity: 0.75 },
    comingSoonOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonText: {
        color: '#fff',
        fontSize: width * 0.035,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    // Location disclaimer
    locationDisclaimer: {
        marginHorizontal: width * 0.038,
        marginBottom: 30,
        backgroundColor: '#FFFBE6',
        borderRadius: 16,
        padding: width * 0.06,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    locationDisclaimerIcon: {
        width: width * 0.14,
        height: width * 0.14,
        borderRadius: width * 0.07,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    locationDisclaimerTitle: {
        fontSize: width * 0.04,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 6,
        textAlign: 'center',
    },
    locationDisclaimerText: {
        fontSize: width * 0.033,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: width * 0.05,
        marginBottom: 16,
        paddingHorizontal: '5%',
    },
    locationDisclaimerButton: {
        backgroundColor: '#FBBF24',
        paddingVertical: width * 0.03,
        paddingHorizontal: width * 0.07,
        borderRadius: 25,
    },
    locationDisclaimerButtonText: {
        fontSize: width * 0.035,
        fontWeight: '800',
        color: '#1a1a1a',
    },

    // Big Discounts
    discountCard: { width: width * 0.5, marginRight: width * 0.038 },
    discountImage: { width: '100%', height: width * 0.3, borderRadius: 15, backgroundColor: '#eee' },
    discountOverlay: { position: 'absolute', top: 10, left: 10 },
    discountBadge: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
    discountBadgeText: { fontSize: width * 0.025, fontWeight: '700', color: '#0082c8' },
    discountInfo: { marginTop: 8 },
    discountName: { fontWeight: '700', color: '#333', fontSize: width * 0.035 },
    discountDesc: { color: '#888', fontSize: width * 0.028 },

    // Footer
    footer: {
        alignItems: 'center',
        paddingTop: width * 0.1,
        paddingBottom: 8,
        backgroundColor: '#FFFCF5',
        marginTop: 20,
    },
    footerLogo: { fontSize: width * 0.06, fontWeight: '900', color: '#FBBF24', marginBottom: 10 },
    footerTagline: {
        color: '#888',
        fontSize: width * 0.025,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: '12%',
    },
    footerLinks: { flexDirection: 'row', marginBottom: 20 },
    footerLink: { marginHorizontal: width * 0.038, color: '#555', fontSize: width * 0.03, fontWeight: '500' },
    copyright: { color: '#ccc', fontSize: width * 0.025 },
});
