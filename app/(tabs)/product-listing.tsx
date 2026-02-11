import { Colors } from '@/constants/Colors';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterModal, { FilterState } from '../../components/product/FilterModal';
import { CATEGORY_DATA, CategoryNode } from '../../constants/categories'; // Import categories
import { PRODUCTS, Product } from '../../constants/products';
import { useWishlist } from '../../context/WishlistContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width / 2) - 20;

export default function ProductListing() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { categoryName, subCategoryName } = params;
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const [activeFilter, setActiveFilter] = useState<string>('All');

    // Filter Modal State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>({
        sortBy: 'relevance',
        priceRanges: [],
        brands: [],
        ratings: [],
        discounts: []
    });

    // 1. Find the current category node (e.g. "T-Shirts") from the deep tree
    const currentCategoryNode = useMemo(() => {
        const targetName = (subCategoryName as string) || (categoryName as string);
        if (!targetName) return null;

        const findNode = (nodes: CategoryNode[]): CategoryNode | null => {
            for (const node of nodes) {
                if (node.name === targetName) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findNode(CATEGORY_DATA);
    }, [categoryName, subCategoryName]);

    // Helper to get all descendant names from a node
    const collectLabels = (node: CategoryNode): string[] => {
        const labels: string[] = [node.name];
        if (node.children) {
            node.children.forEach(child => {
                labels.push(...collectLabels(child));
            });
        }
        return labels;
    };

    // 2. Get all valid sub-labels (leaves) for the initial "All" view
    // If "T-Shirts" is selected, we want products with subCategory = "Round Neck", "Polo", etc.
    // If "Men" is selected, we want everything under Men.
    const allDescendantLabels = useMemo(() => {
        if (!currentCategoryNode) return [];
        return collectLabels(currentCategoryNode);
    }, [currentCategoryNode]);


    // 3. Filter Logic
    const filteredProducts = useMemo(() => {
        // Base filter: Product must be in the current tree hierarchy
        const baseMatches = PRODUCTS.filter(p => {
            // Match against category or subCategory
            // We search if product.subCategory is one of the descendant labels
            // OR if product.category matches currentCategoryNode (fallback)

            if (allDescendantLabels.includes(p.deepestCategoryName)) return true;
            if (allDescendantLabels.includes(p.categoryPath.split('-')[0])) return true;

            return false;
        });

        // Active Filter (Horizontal Tabs)
        if (activeFilter === 'All') {
            return baseMatches;
        } else {
            // Find the selected child node (e.g. "Men")
            const selectedChildNode = currentCategoryNode?.children?.find(c => c.name === activeFilter);

            if (selectedChildNode) {
                // Get all descendants for this specific child (e.g. "Men" -> "Round Neck", "Polo")
                const childDescendants = collectLabels(selectedChildNode);
                return baseMatches.filter(p =>
                    childDescendants.includes(p.deepestCategoryName) || childDescendants.includes(p.categoryPath.split('-')[0])
                );
            }

            // Fallback (exact match)
            return baseMatches.filter(p => p.deepestCategoryName === activeFilter);
        }
    }, [activeFilter, allDescendantLabels, currentCategoryNode]);

    // 4. Advanced Filter & Sort Logic (Applied on top of Category Filter)
    const finalFilteredProducts = useMemo(() => {
        let result = [...filteredProducts];

        // A. Filter by Brand
        if (filterState.brands.length > 0) {
            result = result.filter(p => {
                const brand = p.subtitle ? p.subtitle.toUpperCase() : 'CLASSIC';
                return filterState.brands.includes(brand);
            });
        }

        // B. Filter by Price Range
        if (filterState.priceRanges.length > 0) {
            result = result.filter(p => {
                return filterState.priceRanges.some(range => {
                    if (range === 'Under ₹500') return p.price < 500;
                    if (range === '₹500 - ₹1000') return p.price >= 500 && p.price <= 1000;
                    if (range === '₹1000 - ₹2000') return p.price >= 1000 && p.price <= 2000;
                    if (range === '₹2000 - ₹5000') return p.price >= 2000 && p.price <= 5000;
                    if (range === 'Above ₹5000') return p.price > 5000;
                    return false;
                });
            });
        }

        // C. Filter by Rating
        if (filterState.ratings.length > 0) {
            result = result.filter(p => {
                return filterState.ratings.some(r => {
                    const minRating = parseFloat(r);
                    return (p.rating || 0) >= minRating;
                });
            });
        }

        // D. Filter by Discount
        if (filterState.discounts.length > 0) {
            result = result.filter(p => {
                return filterState.discounts.some(d => {
                    const minDiscount = parseInt(d);
                    return (p.discount || 0) >= minDiscount;
                });
            });
        }

        // E. Sort
        switch (filterState.sortBy) {
            case 'price_low':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price_high':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'new':
                // Mock: using ID or timestamp if available. 
                // Let's assume higher ID is newer for this mock
                result.sort((a, b) => parseInt(b.productId) - parseInt(a.productId));
                break;
            case 'rating':
                result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'discount':
                result.sort((a, b) => (b.discount || 0) - (a.discount || 0));
                break;
            case 'relevance':
            default:
                // Keep default order (which satisfies relevance for now)
                break;
        }

        return result;
    }, [filteredProducts, filterState]);

    // Extract available brands for the current category context for the filter modal
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        filteredProducts.forEach(p => {
            if (p.subtitle) brands.add(p.subtitle.toUpperCase());
            else brands.add('CLASSIC');
        });
        return Array.from(brands).sort();
    }, [filteredProducts]);


    // Render Item
    const renderProductItem = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.productId}`)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                {item.images?.[0] ? (
                    <Image
                        source={typeof item.images[0] === 'string' ? { uri: item.images[0] } : item.images[0]}
                        style={styles.productImage}
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Feather name="image" size={24} color="#ccc" />
                    </View>
                )}

                {/* Favorite Icon */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => isInWishlist(item.productId) ? removeFromWishlist(item.productId) : addToWishlist(item)}
                >
                    <Ionicons
                        name={isInWishlist(item.productId) ? "heart" : "heart-outline"}
                        size={20}
                        color={isInWishlist(item.productId) ? "#FF3B30" : "#333"}
                    />
                </TouchableOpacity>

                {/* New Arrival Badge (Mock logic: odd IDs) */}
                {parseInt(item.productId) % 2 !== 0 && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW ARRIVAL</Text>
                    </View>
                )}
            </View>

            <View style={styles.productInfo}>
                {/* Brand / Subtitle */}
                <Text style={styles.productBrand}>
                    {item.subtitle ? item.subtitle.toUpperCase() : 'CLASSIC'}
                </Text>

                {/* Name */}
                <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>

                {/* Price Row */}
                <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{item.price}</Text>
                    {item.originalPrice && (
                        <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: currentCategoryNode?.name || 'Products',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10, marginLeft: '10%' }}>
                        <Feather name="chevron-left" size={28} color="#000" />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <View style={{ flexDirection: 'row', gap: 15, marginRight: '10%' }}>
                        <TouchableOpacity onPress={() => router.push('/product-search')}><Feather name="search" size={24} color="#000" /></TouchableOpacity>
                        <TouchableOpacity><Feather name="shopping-bag" size={24} color="#000" /></TouchableOpacity>
                    </View>
                ),
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '700', fontSize: 20 },
                headerTitleAlign: 'center' // Android center
            }} />

            {/* Horizontal Filter Bar */}
            {currentCategoryNode?.children && currentCategoryNode.children.length > 0 && (
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {/* 'All' Option */}
                        <TouchableOpacity
                            style={styles.filterItem}
                            onPress={() => setActiveFilter('All')}
                        >
                            <View style={[styles.filterCircle, activeFilter === 'All' && styles.filterCircleActive]}>
                                <View style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontWeight: '800', fontSize: 12 }}>ALL</Text>
                                </View>
                            </View>
                            <Text style={[styles.filterText, activeFilter === 'All' && styles.filterTextActive]}>All</Text>
                        </TouchableOpacity>

                        {/* Children Options */}
                        {currentCategoryNode.children.map((child) => (
                            <TouchableOpacity
                                key={child.id}
                                style={styles.filterItem}
                                onPress={() => setActiveFilter(child.name)}
                            >
                                <View style={[styles.filterCircle, activeFilter === child.name && styles.filterCircleActive]}>
                                    {child.image ? (
                                        <Image source={child.image} style={styles.filterImage} />
                                    ) : (
                                        <View style={{ backgroundColor: '#eee', flex: 1 }} />
                                    )}
                                </View>
                                <Text style={[styles.filterText, activeFilter === child.name && styles.filterTextActive]}>
                                    {child.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Count & Sort Bar */}
            <View style={styles.sortBar}>
                <Text style={styles.productCount}>{finalFilteredProducts.length} Products</Text>
                <TouchableOpacity style={styles.sortButton} onPress={() => setFilterModalVisible(true)}>
                    <Feather name="sliders" size={14} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.sortButtonText}>Sort & Filter</Text>
                </TouchableOpacity>
            </View>

            {/* Product Grid */}
            <FlatList
                data={finalFilteredProducts}
                renderItem={renderProductItem}
                keyExtractor={item => item.productId}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="inbox" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No products found.</Text>
                    </View>
                }
            />

            {/* Filter Modal */}
            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setFilterState}
                initialFilters={filterState}
                availableBrands={availableBrands}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    // Filters
    filterContainer: {
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    filterScroll: {
        paddingHorizontal: 15,
        gap: 15
    },
    filterItem: {
        alignItems: 'center',
        marginRight: 15
    },
    filterCircle: {
        width: 60,
        height: 60, // Fixed size circles
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: 4,
        backgroundColor: '#f5f5f5'
    },
    filterCircleActive: {
        borderColor: Colors.light.tint // Active yellow border
    },
    filterImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    filterText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500'
    },
    filterTextActive: {
        color: '#000',
        fontWeight: '700'
    },

    // Sort Bar
    sortBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        marginTop: 5
    },
    productCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555'
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    sortButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000'
    },

    // Grid
    listContent: { paddingHorizontal: 15, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },

    // Product Card
    productCard: {
        width: CARD_WIDTH,
        marginBottom: 20,
        // No border/shadow for clean, flat 'Uniqlo/Zara' look or card look
    },
    imageContainer: {
        height: CARD_WIDTH * 1.3, // 4:5 Aspect Ratio approx
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
        position: 'relative'
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    placeholderImage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    newBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: Colors.light.tint, // Yellow
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    newBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000'
    },
    productInfo: {
        paddingHorizontal: 4
    },
    productBrand: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF', // Gray-400
        marginBottom: 2,
        letterSpacing: 0.5
    },
    productName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827', // Gray-900
        marginBottom: 4,
        lineHeight: 20
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6
    },
    price: {
        fontSize: 15,
        fontWeight: '800',
        color: '#000'
    },
    originalPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through'
    },

    // Empty
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#888' }
});
