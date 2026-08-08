import { Image } from 'expo-image';
import * as ExpoLocation from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, ChevronDown, Heart, MapPin, Search, ShoppingBag, Star, Tag, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Linking, NativeScrollEvent, NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import LegalDocModal, { LegalDocType } from '../../components/common/LegalDocModal';
import { ProductCard, SectionHeader, ZText } from '../../components/ui';
import { DELIVERY_CITY, isPuneLocation } from '../../constants/delivery';
import { colors, fonts, palette, radius, shadow } from '../../constants/theme';
import { useSearch } from '../../context/SearchContext';
import { FlashDeal, flashDealService } from '../../services/flashDeals';
import { productService } from '../../services/product';
import { productOneLiner } from '../../utils/productDetail';

const CATEGORIES = [
    { id: 'fashion', name: 'Fashion', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=200&q=80' },
    { id: 'footwear', name: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80' },
    { id: 'accessories', name: 'Accessories', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=200&q=80' },
    { id: 'beauty', name: 'Beauty', image: require('../../assets/images/beauty_icon.jpg') },
    { id: 'home', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=200&q=80' },
];

const RECOMMENDED = [
    { id: '1', name: 'Bags', desc: 'From ₹499', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Bags' },
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
    { id: '1', name: 'Men', image: require('../../assets/images/men_icon.jpg'), category: 'Fashion', subCategory: 'Men', count: null as number | null },
    { id: '2', name: 'Women', image: require('../../assets/images/women_icon.jpg'), category: 'Fashion', subCategory: 'Women', count: null as number | null },
    { id: '3', name: 'Kids', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=200&q=80', category: 'Fashion', subCategory: 'Kids', count: 0 as number | null },
    { id: '4', name: 'Makeup', image: require('../../assets/images/makeup_icon.jpg'), category: 'Beauty', subCategory: 'Makeup', count: null as number | null },
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=500&q=80';

const BIG_DISCOUNTS = [
    { id: '1', name: 'Sneaker Steals', desc: "Grab a pair before it's gone!", image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80', category: 'Footwear', subCategory: 'Sports Shoes' },
    { id: '2', name: 'Winter Clearance', desc: 'Up to 80% off jackets', image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=400&q=80', category: 'Fashion', subCategory: 'Jackets' },
];

// "For you" infinite grid: paginate up to a cap, then stop and offer "See all".
const FORYOU_PAGE_SIZE = 12;
const FORYOU_MAX = 60;      // stop auto-loading past this; show "See all products" instead
const BANNER_EVERY = 6;     // drop a banner card after every N products (even → keeps 2-col pairs intact)

// Rotating banner cards to break the grid monotony — different look + copy each.
type ForYouBanner = { key: string; variant: 'dark' | 'yellow' | 'light' | 'green'; icon: 'zap' | 'star' | 'tag'; eyebrow: string; title: string; sub: string };
const FORYOU_BANNERS: ForYouBanner[] = [
    { key: 'delivery', variant: 'dark', icon: 'zap', eyebrow: 'LIVE IN YOUR AREA', title: 'Estimated delivery within 12 hrs', sub: 'Bike-fast, straight to your door' },
    { key: 'try', variant: 'yellow', icon: 'zap', eyebrow: 'TRY-AT-DOOR', title: 'Try it on before you pay', sub: 'Keep what fits, send back the rest' },
    { key: 'rated', variant: 'light', icon: 'star', eyebrow: 'LOVED NEARBY', title: 'Rated 4.8 by shoppers near you', sub: 'Thousands are styling with ZPIN' },
    { key: 'deal', variant: 'green', icon: 'tag', eyebrow: 'MEGA HOURS', title: 'Up to 70% off, today only', sub: 'Fresh deals drop every few hours' },
];

// Per-variant colours so no two banners look alike.
const FORYOU_BANNER_STYLES = {
    dark: { card: { backgroundColor: palette.ink }, iconBg: 'rgba(255,255,255,0.1)', iconColor: palette.yellow500, eyebrow: palette.yellow400, title: palette.neutral0, sub: palette.neutral300 },
    yellow: { card: { backgroundColor: palette.yellow500 }, iconBg: palette.ink, iconColor: palette.yellow500, eyebrow: palette.yellow900, title: palette.ink, sub: palette.neutral700 },
    light: { card: { backgroundColor: palette.neutral0, borderWidth: 1, borderColor: palette.neutral200 }, iconBg: palette.yellow50, iconColor: palette.yellow600, eyebrow: palette.neutral500, title: palette.ink, sub: palette.neutral500 },
    green: { card: { backgroundColor: palette.green500 }, iconBg: 'rgba(255,255,255,0.14)', iconColor: palette.neutral0, eyebrow: palette.green100, title: palette.neutral0, sub: palette.green100 },
} as const;

export default function HomeScreen() {
    const router = useRouter();
    const { recentSearches, isLoading: searchLoading } = useSearch();
    const [freshArrivals, setFreshArrivals] = useState<any[]>(FRESH_ARRIVALS);
    // Admin-managed flash deals. The strip only exists while a deal is live.
    const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
    const [recommended, setRecommended] = useState<any[]>(RECOMMENDED);
    const [nearby, setNearby] = useState<any[]>(NEARBY_FALLBACK);
    const [locationLabel, setLocationLabel] = useState<string>('Your Area');
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
    const [inServiceArea, setInServiceArea] = useState<boolean | null>(null);
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [comingSoonModal, setComingSoonModal] = useState<{ visible: boolean; name: string }>({ visible: false, name: '' });
    const appState = useRef(AppState.currentState);
    const awaitingSettingsReturn = useRef(false);
    const lastFetchRef = useRef(0);
    const lastCoordsRef = useRef<{ lat?: number; lng?: number }>({});
    const STALE_MS = 5 * 60 * 1000;

    // "For you" personalized infinite grid state
    const [forYou, setForYou] = useState<any[]>([]);
    const [forYouLoading, setForYouLoading] = useState(true);
    const [forYouLoadingMore, setForYouLoadingMore] = useState(false);
    const [forYouDone, setForYouDone] = useState(false);
    const fyFetching = useRef(false);
    const fyPage = useRef(0);
    const fyHasMore = useRef(true);
    const fyCount = useRef(0);
    const fySeen = useRef<Set<string>>(new Set());
    const fyBootstrapped = useRef(false);

    const openLegalDoc = (type: LegalDocType) => {
        setLegalDocType(type);
        setLegalModalVisible(true);
    };

    // Robust GPS read: services must be on; try instant cached fix, then a live fix
    // that can't hang forever (races a timeout). Returns undefined coords on failure.
    const getCoords = async (): Promise<{ lat?: number; lng?: number }> => {
        try {
            const servicesOn = await ExpoLocation.hasServicesEnabledAsync();
            if (!servicesOn) {
                console.warn('Location services are disabled on this device');
                return {};
            }
            const cached = await ExpoLocation.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
            if (cached) return { lat: cached.coords.latitude, lng: cached.coords.longitude };

            const live = await Promise.race([
                ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
            ]);
            if (live) return { lat: live.coords.latitude, lng: live.coords.longitude };
            console.warn('getCurrentPositionAsync timed out after 12s');
            return {};
        } catch (e) {
            console.warn('getCoords failed:', e);
            return {};
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        // Reset the "for you" feed so it re-personalizes from scratch.
        fyPage.current = 0; fyHasMore.current = true; fyCount.current = 0; fySeen.current.clear();
        setForYouDone(false);
        loadForYou(false);
        const { status } = await ExpoLocation.getForegroundPermissionsAsync();
        if (status === 'granted') {
            setLocationGranted(true);
            const { lat, lng } = await getCoords();
            await applyLocationLabel(lat, lng);
            await fetchProducts(lat, lng);
        } else {
            await fetchProducts();
        }
        setRefreshing(false);
    };

    // Flash deals load independently of location/products — an empty list simply
    // hides the strip.
    useEffect(() => {
        flashDealService.getFlashDeals().then(setFlashDeals).catch(() => setFlashDeals([]));
    }, []);

    useEffect(() => {
        // Do NOT prompt for location at launch (App Store 5.1.1 — request in-context).
        ExpoLocation.getForegroundPermissionsAsync().then(({ status }) => {
            if (status === 'granted') {
                requestLocationAndFetch();
            } else {
                setLocationGranted(false);
                fetchProducts();
            }
        });
    }, []);

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

    // Reverse-geocode coords into the "Deliver to" label + Pune service-area flag.
    const applyLocationLabel = async (lat?: number, lng?: number) => {
        if (lat == null || lng == null) return;
        try {
            const [place] = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (place) {
                const label = place.district || place.subregion || place.city || place.region || 'Your Area';
                setLocationLabel(label);
                setInServiceArea(isPuneLocation(place));
            }
        } catch (e) {
            console.warn('reverseGeocode failed:', e);
        }
    };

    const requestLocationAndFetch = async () => {
        let lat: number | undefined;
        let lng: number | undefined;
        try {
            const { status: currentStatus } = await ExpoLocation.getForegroundPermissionsAsync();
            if (currentStatus === 'denied') {
                setLocationGranted(false);
                awaitingSettingsReturn.current = true;
                await Linking.openSettings();
                return;
            }
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            setLocationGranted(status === 'granted');
            if (status === 'granted') {
                ({ lat, lng } = await getCoords());
                await applyLocationLabel(lat, lng);
            }
        } catch (e) {
            console.warn('requestLocationAndFetch failed:', e);
        }
        await fetchProducts(lat, lng);
    };

    const fetchProducts = async (lat?: number, lng?: number) => {
        if (isLoadingProducts) return;
        setIsLoadingProducts(true);
        setError(null);
        lastCoordsRef.current = { lat, lng };
        try {
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
            lastFetchRef.current = Date.now();
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
            if (Date.now() - lastFetchRef.current > STALE_MS) {
                const { lat, lng } = lastCoordsRef.current;
                fetchProducts(lat, lng);
            }
        }, [])
    );

    const handleProductNav = (category: string, subCategory?: string) => {
        router.push({ pathname: '/product-listing', params: { categoryName: category, subCategoryName: subCategory } });
    };

    const handleNearbyNav = (item: any) => {
        if (item.count != null && item.count <= 0) {
            setComingSoonModal({ visible: true, name: item.name });
            return;
        }
        handleProductNav(item.category, item.subCategory);
    };

    // Load one page of the "For you" feed. The first (append=false) load leads with
    // products matched to recent searches, so the feed is personalized up top.
    const loadForYou = useCallback(async (append: boolean) => {
        if (fyFetching.current || (append && (!fyHasMore.current || fyCount.current >= FORYOU_MAX))) return;
        fyFetching.current = true;
        if (append) setForYouLoadingMore(true); else setForYouLoading(true);
        try {
            const nextPage = append ? fyPage.current + 1 : 1;
            const lead = !append && recentSearches.length
                ? await productService.getRecommended(recentSearches, 10).catch(() => [])
                : [];
            const res = await productService.getProducts({ page: nextPage, limit: FORYOU_PAGE_SIZE });
            const incoming = [...lead, ...(res.products || [])];
            // Mark as seen inside the filter: `lead` and `res.products` overlap (a
            // recommended product also shows up in the general page), and a filter-then-add
            // pass lets both copies through, producing duplicate React keys.
            const fresh = incoming.filter(p => {
                if (!p.productId || fySeen.current.has(p.productId)) return false;
                fySeen.current.add(p.productId);
                return true;
            });

            const prevCount = append ? fyCount.current : 0;
            const toAdd = fresh.slice(0, Math.max(0, FORYOU_MAX - prevCount));
            fyCount.current = prevCount + toAdd.length;
            fyPage.current = nextPage;
            fyHasMore.current = !!res.pagination?.hasNextPage;
            setForYou(prev => (append ? [...prev, ...toAdd] : toAdd));
            setForYouDone(fyCount.current >= FORYOU_MAX || !fyHasMore.current);
        } catch (e) {
            console.warn('loadForYou failed:', e);
            if (!append) fyHasMore.current = false;
        } finally {
            setForYouLoading(false);
            setForYouLoadingMore(false);
            fyFetching.current = false;
        }
    }, [recentSearches]);

    // Bootstrap once recent searches have loaded (so personalization is applied).
    useEffect(() => {
        if (searchLoading || fyBootstrapped.current) return;
        fyBootstrapped.current = true;
        loadForYou(false);
    }, [searchLoading, loadForYou]);

    // If the first load came back empty (e.g. the Render backend was still cold and
    // the request failed), retry when the Home tab regains focus so the section
    // fills in instead of staying blank.
    useFocusEffect(
        useCallback(() => {
            if (fyBootstrapped.current && !fyFetching.current && forYou.length === 0) {
                loadForYou(false);
            }
        }, [forYou.length, loadForYou])
    );

    // Near-bottom detection on the page scroll (avoids nesting a FlatList in the ScrollView).
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!fyBootstrapped.current) return;
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        if (contentSize.height - contentOffset.y - layoutMeasurement.height < 700) loadForYou(true);
    };

    // Weave banner cards into the product stream every BANNER_EVERY items.
    const forYouItems = useMemo(() => {
        const out: { type: 'product' | 'banner'; data: any; key: string }[] = [];
        forYou.forEach((p, i) => {
            out.push({ type: 'product', data: p, key: `p-${p.productId}` });
            if ((i + 1) % BANNER_EVERY === 0 && i + 1 < forYou.length) {
                const b = FORYOU_BANNERS[Math.floor(i / BANNER_EVERY) % FORYOU_BANNERS.length];
                out.push({ type: 'banner', data: b, key: `b-${i}-${b.key}` });
            }
        });
        return out;
    }, [forYou]);

    const renderForYouBanner = (b: ForYouBanner, key: string) => {
        const v = FORYOU_BANNER_STYLES[b.variant];
        const Icon = b.icon === 'star' ? Star : b.icon === 'tag' ? Tag : Zap;
        return (
            <Pressable key={key} style={[styles.fyBanner, v.card]} onPress={() => router.push('/product-listing')}>
                <View style={[styles.fyBannerIcon, { backgroundColor: v.iconBg }]}>
                    <Icon size={20} color={v.iconColor} fill={b.icon === 'star' ? v.iconColor : 'transparent'} />
                </View>
                <View style={styles.fyBannerText}>
                    <Text style={[styles.fyBannerEyebrow, { color: v.eyebrow }]}>{b.eyebrow}</Text>
                    <Text style={[styles.fyBannerTitle, { color: v.title }]} numberOfLines={1}>{b.title}</Text>
                    <Text style={[styles.fyBannerSub, { color: v.sub }]} numberOfLines={1}>{b.sub}</Text>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                        awaitingSettingsReturn.current = true;
                        await Linking.openSettings();
                    } else {
                        requestLocationAndFetch();
                    }
                }}
                secondaryButtonText="Skip"
                onSecondaryPress={() => { setShowLocationModal(false); setLocationGranted(false); fetchProducts(); }}
                onClose={() => { setShowLocationModal(false); setLocationGranted(false); fetchProducts(); }}
            />
            <ActionModal
                visible={showAreaModal}
                icon="map-pin"
                title="Outside delivery area"
                message={`ZPIN currently delivers only in ${DELIVERY_CITY}. We're expanding soon — stay tuned!`}
                primaryButtonText="Got it"
                onPrimaryPress={() => setShowAreaModal(false)}
                onClose={() => setShowAreaModal(false)}
            />
            <ActionModal
                visible={comingSoonModal.visible}
                icon="clock"
                title="Coming Soon"
                message={`${comingSoonModal.name} products will be available in your area soon!`}
                primaryButtonText="Got it"
                onPrimaryPress={() => setComingSoonModal({ visible: false, name: '' })}
                onClose={() => setComingSoonModal({ visible: false, name: '' })}
            />
            <ActionModal
                visible={contactModalVisible}
                icon="phone"
                title="Contact Us"
                message="How would you like to reach us?"
                primaryButtonText="Call Us"
                onPrimaryPress={() => { setContactModalVisible(false); Linking.openURL('tel:8789582754'); }}
                secondaryButtonText="Email Us"
                onSecondaryPress={() => { setContactModalVisible(false); Linking.openURL('mailto:zpinpvtltd@gmail.com?subject=Contact Zpin'); }}
                onClose={() => setContactModalVisible(false)}
            />
            <LegalDocModal visible={legalModalVisible} docType={legalDocType} onClose={() => setLegalModalVisible(false)} />

            {/* Top bar */}
            <View style={styles.topBar}>
                <View style={styles.brandRow}>
                    <Text style={styles.wordmark}>ZPIN</Text>
                    <View style={styles.topIcons}>
                        <Pressable style={styles.iconBtn} onPress={() => router.push('/profile/wishlist')}>
                            <Heart size={20} color={colors.textStrong} />
                        </Pressable>
                        <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/cart')}>
                            <ShoppingBag size={20} color={colors.textStrong} />
                        </Pressable>
                    </View>
                </View>
                <Pressable
                    style={styles.addressRow}
                    onPress={() => {
                        if (locationGranted && inServiceArea === false) setShowAreaModal(true);
                        else if (locationGranted) requestLocationAndFetch();
                        else setShowLocationModal(true);
                    }}
                >
                    <MapPin size={14} color={locationGranted && inServiceArea === false ? palette.red500 : palette.yellow600} />
                    <Text style={styles.addressText}>Deliver to </Text>
                    {locationGranted && inServiceArea === false ? (
                        <Text style={[styles.addressPlace, { color: palette.red500 }]}>{DELIVERY_CITY} only</Text>
                    ) : (
                        <Text style={styles.addressPlace}>{locationGranted ? locationLabel : 'set location'}</Text>
                    )}
                    <ChevronDown size={14} color={colors.textMuted} />
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
            >
                {/* Search */}
                <Pressable style={styles.search} onPress={() => router.push('/product-search')}>
                    <Search size={19} color={colors.textFaint} />
                    <Text style={styles.searchPlaceholder}>Search styles, sneakers, gadgets</Text>
                </Pressable>

                {/* Bike-fast delivery banner */}
                <View style={styles.deliveryBanner}>
                    <View style={styles.deliveryZap}>
                        <Zap size={120} color="rgba(255,196,0,0.14)" fill="rgba(255,196,0,0.14)" />
                    </View>
                    <View>
                        <Text style={styles.deliveryEyebrow}>Estimated delivery within</Text>
                        <View style={styles.deliveryHrsRow}>
                            <Text style={styles.deliveryHrs}>2-12</Text>
                            <Text style={styles.deliveryHrsUnit}>HRS</Text>
                        </View>
                    </View>
                    <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.livePillText}>LIVE IN YOUR AREA</Text>
                    </View>
                </View>

                {/* Category chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {CATEGORIES.map((cat) => (
                        <Pressable
                            key={cat.id}
                            style={styles.chip}
                            onPress={() => router.push({ pathname: '/(tabs)/categories', params: { categoryId: cat.id } })}
                        >
                            <View style={styles.chipImageWrap}>
                                <Image source={typeof cat.image === 'string' ? { uri: cat.image } : cat.image} style={styles.chipImage} contentFit="cover" />
                            </View>
                            <Text style={styles.chipText} numberOfLines={1}>{cat.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Try-at-door hero */}
                <View style={styles.hero}>
                    <View style={styles.heroImageWrap}>
                        <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} contentFit="cover" />
                    </View>
                    <View style={styles.heroContent}>
                        <View style={styles.tryBadge}>
                            <Zap size={11} color={palette.yellow500} fill={palette.yellow500} />
                            <Text style={styles.tryBadgeText}>TRY-AT-DOOR</Text>
                        </View>
                        <Text style={styles.heroTitle}>Wear it before you buy it.</Text>
                        <Pressable style={styles.heroCta} onPress={() => router.push('/product-listing')}>
                            <Text style={styles.heroCtaText}>Shop new in</Text>
                            <ArrowRight size={16} color={palette.yellow500} />
                        </Pressable>
                    </View>
                </View>

                {/* Recommended */}
                <SectionHeader eyebrow="Fresh today" title="New in your size" actionLabel="See all" onAction={() => router.push('/product-listing')} style={styles.section} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                    {recommended.map((item) => (
                        <ProductCard
                            key={item.id}
                            width={168}
                            style={styles.hCard}
                            image={item.image}
                            brand="ZPIN"
                            name={item.name}
                            price={item.desc}
                            tryAtDoor
                            onPress={() => handleProductNav(item.category, item.subCategory)}
                        />
                    ))}
                </ScrollView>

                {/* Flash Deals — admin-managed, hidden when nothing is running */}
                {flashDeals.length > 0 && (
                    <>
                        <SectionHeader
                            eyebrow="Ends soon"
                            title="Flash deals"
                            actionLabel="See all"
                            onAction={() => router.push('/flash-deals' as any)}
                            style={styles.section}
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                            {flashDeals.slice(0, 8).map((deal) => (
                                <ProductCard
                                    key={deal.id}
                                    width={168}
                                    style={styles.hCard}
                                    image={deal.images?.[0] || ''}
                                    brand={deal.label}
                                    name={deal.productName}
                                    price={deal.dealPrice}
                                    originalPrice={deal.originalPrice}
                                    discount={deal.discountPercent > 0 ? `${deal.discountPercent}%` : undefined}
                                    onPress={() => router.push(`/product/${deal.productId}`)}
                                />
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Fresh Arrivals */}
                <SectionHeader eyebrow="Just dropped" title="Fresh arrivals" style={styles.section} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                    {freshArrivals.map((item) => (
                        <Pressable key={item.id} style={styles.freshCard} onPress={() => handleProductNav(item.category, item.subCategory)}>
                            <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.freshImage} contentFit="cover" />
                            <View style={styles.freshOverlay}>
                                <Text style={styles.freshName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.freshOffer}>{item.offer}</Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Nearby */}
                <SectionHeader
                    eyebrow={locationGranted ? locationLabel : 'Trending near you'}
                    title="Nearby availabilities"
                    style={styles.section}
                />
                {locationGranted ? (
                    <View style={styles.nearbyGrid}>
                        {nearby.map((item) => {
                            const soon = item.count != null && item.count <= 0;
                            return (
                                <Pressable key={item.id} style={styles.nearbyItem} onPress={() => handleNearbyNav(item)}>
                                    <View style={styles.nearbyImageWrap}>
                                        <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.nearbyImage} contentFit="cover" />
                                        {item.count != null && item.count > 0 && (
                                            <View style={styles.nearbyBadge}><Text style={styles.nearbyBadgeText}>{item.count}+</Text></View>
                                        )}
                                        {soon && <View style={styles.soonOverlay}><Text style={styles.soonText}>Coming soon</Text></View>}
                                    </View>
                                    <Text style={styles.nearbyName}>{item.name}</Text>
                                    {item.count != null && (
                                        <Text style={styles.nearbyCount}>{item.count > 0 ? `${item.count} items` : 'Coming soon'}</Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ) : (
                    <Pressable style={styles.locCard} onPress={() => setShowLocationModal(true)}>
                        <View style={styles.locIcon}><MapPin size={26} color={palette.yellow600} /></View>
                        <ZText variant="lg" style={{ marginBottom: 4 }}>Location access required</ZText>
                        <ZText variant="muted" style={styles.locText}>Allow location to discover products available near you.</ZText>
                        <View style={styles.locBtn}><Text style={styles.locBtnText}>Enable location</Text></View>
                    </Pressable>
                )}

                {/* Big Discounts */}
                <SectionHeader eyebrow="Mega hours" title="Big discounts" style={styles.section} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                    {BIG_DISCOUNTS.map((item) => (
                        <Pressable key={item.id} style={styles.discountCard} onPress={() => handleProductNav(item.category, item.subCategory)}>
                            <Image source={{ uri: item.image }} style={styles.discountImage} contentFit="cover" />
                            <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>FLAT 40% OFF</Text></View>
                            <View style={styles.discountInfo}>
                                <Text style={styles.discountName}>{item.name}</Text>
                                <Text style={styles.discountDesc}>{item.desc}</Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* For you — personalized infinite grid */}
                <SectionHeader
                    eyebrow={recentSearches.length ? `Because you searched "${recentSearches[0]}"` : 'Just for you'}
                    title="More to explore"
                    style={styles.section}
                />
                {forYouLoading ? (
                    <View style={styles.fyLoader}><ActivityIndicator color={palette.yellow600} /></View>
                ) : (
                    <View style={styles.fyGrid}>
                        {forYouItems.map((node) =>
                            node.type === 'banner'
                                ? renderForYouBanner(node.data, node.key)
                                : (
                                    <ProductCard
                                        key={node.key}
                                        style={styles.fyCard}
                                        image={node.data.images?.[0] ?? require('../../assets/images/icon_backup.png')}
                                        brand={node.data.deepestCategoryName || 'ZPIN'}
                                        name={node.data.productName}
                                        detail={productOneLiner(node.data)}
                                        price={node.data.price}
                                        originalPrice={node.data.originalPrice ?? undefined}
                                        discount={(node.data.discount ?? 0) > 0 ? `${node.data.discount}% OFF` : undefined}
                                        tryAtDoor
                                        onPress={() => router.push(`/product/${node.data.productId}`)}
                                    />
                                )
                        )}
                    </View>
                )}
                {forYouLoadingMore && <View style={styles.fyLoader}><ActivityIndicator size="small" color={palette.yellow600} /></View>}
                {forYouDone && forYou.length > 0 && (
                    <Pressable style={styles.fySeeAll} onPress={() => router.push('/product-listing')}>
                        <Text style={styles.fySeeAllText}>See all products</Text>
                        <ArrowRight size={16} color={colors.textInvert} />
                    </Pressable>
                )}

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
    container: { flex: 1, backgroundColor: palette.paperWarm },
    scrollContent: { paddingBottom: 130 },

    topBar: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
    brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    wordmark: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -1, color: colors.textStrong },
    topIcons: { flexDirection: 'row', gap: 8 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    addressText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
    addressPlace: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },

    search: {
        marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 11,
        backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle,
        borderRadius: radius.md, height: 50, paddingHorizontal: 15,
    },
    searchPlaceholder: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textFaint },

    deliveryBanner: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.surfaceInverse, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    deliveryZap: { position: 'absolute', right: -18, top: -18 },
    deliveryEyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.4, color: palette.yellow400, textTransform: 'uppercase', marginBottom: 6 },
    deliveryHrsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    deliveryHrs: { fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: -0.6, color: colors.textInvert },
    deliveryHrsUnit: { fontFamily: fonts.monoBold, fontSize: 12, color: palette.neutral300, marginBottom: 3 },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.yellow500 },
    livePillText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.textInvert },

    hero: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.yellow500, borderRadius: 28, padding: 22, position: 'relative', overflow: 'hidden' },
    heroImageWrap: { position: 'absolute', right: -30, bottom: -40, width: 200, height: 230, borderRadius: 24, overflow: 'hidden', transform: [{ rotate: '6deg' }] },
    heroImage: { width: '100%', height: '100%' },
    heroContent: { maxWidth: '64%' },
    tryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.surfaceInverse, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 100, marginBottom: 14 },
    tryBadgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.1, color: colors.textInvert },
    heroTitle: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 28, letterSpacing: -0.5, color: colors.textOnYellow },
    heroTitleItalic: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 28, letterSpacing: -0.5, color: colors.textOnYellow, fontStyle: 'italic', marginBottom: 16 },
    heroCta: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.surfaceInverse, borderRadius: 100, paddingVertical: 12, paddingHorizontal: 18 },
    heroCtaText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textInvert },

    chipsRow: { paddingHorizontal: 20, gap: 16, marginTop: 22 },
    chip: { alignItems: 'center', width: 68 },
    chipImageWrap: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.surfaceSunken, marginBottom: 7, borderWidth: 1, borderColor: colors.borderSubtle },
    chipImage: { width: '100%', height: '100%' },
    chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textBody, textAlign: 'center' },

    section: { paddingHorizontal: 20, marginTop: 28 },
    hList: { paddingHorizontal: 20, gap: 14 },
    hCard: { width: 168 },

    freshCard: { width: 160, height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
    freshImage: { width: '100%', height: '100%' },
    freshOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(252,251,246,0.92)', padding: 12 },
    freshName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    freshOffer: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },

    nearbyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', rowGap: 16 },
    nearbyItem: { width: '47.5%' },
    nearbyImageWrap: { width: '100%', aspectRatio: 1.4, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceSunken, marginBottom: 8 },
    nearbyImage: { width: '100%', height: '100%' },
    nearbyBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: palette.yellow500, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
    nearbyBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textOnYellow },
    soonOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,11,0.4)', alignItems: 'center', justifyContent: 'center' },
    soonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },
    nearbyName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textStrong },
    nearbyCount: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 1 },

    locCard: { marginHorizontal: 20, backgroundColor: colors.surfaceBrandTint, borderRadius: radius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: palette.yellow200 },
    locIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadow.sm },
    locText: { textAlign: 'center', marginBottom: 16 },
    locBtn: { backgroundColor: palette.yellow500, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24 },
    locBtnText: { fontFamily: fonts.bodyBlack, fontSize: 14, color: colors.textOnYellow },

    discountCard: { width: 240 },
    discountImage: { width: '100%', height: 140, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken },
    discountBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(252,251,246,0.95)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.xs },
    discountBadgeText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.4, color: palette.green500 },
    discountInfo: { marginTop: 10 },
    discountName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textStrong },
    discountDesc: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 1 },

    fyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', rowGap: 20, marginTop: 4 },
    fyCard: { width: '47.5%' },
    fyLoader: { paddingVertical: 24, alignItems: 'center' },
    fyBanner: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16, overflow: 'hidden' },
    fyBannerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    fyBannerText: { flex: 1 },
    fyBannerEyebrow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, marginBottom: 4 },
    fyBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 15, marginBottom: 2 },
    fyBannerSub: { fontFamily: fonts.bodyRegular, fontSize: 12 },
    fySeeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center', marginTop: 24, backgroundColor: colors.surfaceInverse, borderRadius: 100, paddingVertical: 14, paddingHorizontal: 28 },
    fySeeAllText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textInvert },

    footer: { alignItems: 'center', paddingTop: 40, paddingBottom: 8, marginTop: 28 },
    footerLogo: { fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: -1, color: colors.textStrong, marginBottom: 10 },
    footerTagline: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 18, paddingHorizontal: 48 },
    footerLinks: { flexDirection: 'row', gap: 20, marginBottom: 16 },
    footerLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textBody },
    copyright: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint },
});
