import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import { CATEGORY_DATA, CategoryNode } from '../../constants/categories';
import { useSearch } from '../../context/SearchContext';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');

// Distinct badge background colour derived from the category name, so
// subcategories sharing a first letter (e.g. Sunscreen vs Serums) are visually distinguishable.
const BADGE_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const badgeColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
};

// Calculate layout sizes dynamically based on screen width to prevent circles from overlapping on smaller mobile devices
const SIDEBAR_WIDTH = Math.round(width * 0.25);
const LEVEL2_MARGIN = Math.round(width * 0.038);
const LEVEL3_PADDING = Math.round(width * 0.038);
const NUM_COLUMNS = 3;

const maxGridWidth = width - SIDEBAR_WIDTH - (LEVEL2_MARGIN * 2) - (LEVEL3_PADDING * 2);
const columnWidth = maxGridWidth / NUM_COLUMNS;

// Dynamic dimensions for category circles and rectangles
const CIRCLE_SIZE = Math.min(70, Math.floor(columnWidth - 12));
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const RECT_WIDTH = CIRCLE_SIZE;
const RECT_HEIGHT = Math.floor(CIRCLE_SIZE * (85 / 70));

// --- Sidebar Component ---
const Sidebar = ({
    categories,
    selectedId,
    onSelect
}: {
    categories: CategoryNode[];
    selectedId: string;
    onSelect: (id: string) => void;
}) => {
    return (
        <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
                {categories.map((cat) => {
                    const isSelected = selectedId === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
                            onPress={() => onSelect(cat.id)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.sidebarIcon, isSelected && styles.sidebarIconSelected]}>
                                <Feather name={cat.icon as any || 'circle'} size={20} color={isSelected ? '#000' : '#555'} />
                            </View>
                            <Text style={[styles.sidebarText, isSelected && styles.sidebarTextSelected]}>
                                {cat.name}
                            </Text>
                            {isSelected && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

// --- Recursive / Grid Content ---
const CategoryGridSection = ({
    sectionTitle,
    items,
    onItemPress,
}: {
    sectionTitle?: string;
    items: CategoryNode[];
    onItemPress: (item: CategoryNode) => void;
}) => {
    if (!items || items.length === 0) return null;

    return (
        <View style={styles.gridSection}>
            {sectionTitle && (
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.gridSectionTitle}>{sectionTitle.toUpperCase()}</Text>
                </View>
            )}
            <View style={styles.gridContainer}>
                {items.map((item) => {
                    // Always circle — rectangle only if item has an explicit image AND children
                    const hasChildren = item.children && item.children.length > 0;
                    const useRect = hasChildren && !!item.image;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.gridItemContainer}
                            onPress={() => onItemPress(item)}
                        >
                            <View style={[
                                styles.gridImageContainer,
                                useRect ? styles.rectImage : styles.circleImage,
                                !useRect && styles.highlightedBorder,
                            ]}>
                                {item.image ? (
                                    <Image source={item.image} style={styles.gridImage} />
                                ) : (
                                    <View style={[styles.gridImage, { backgroundColor: badgeColor(item.name), alignItems: 'center', justifyContent: 'center' }]}>
                                        <Text style={{ fontSize: Math.max(10, Math.floor(CIRCLE_SIZE * 0.2)), fontWeight: '700', color: '#fff', textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={2}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.gridItemText} numberOfLines={2}>{item.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};


const MainCategoryView = ({
    category,
    onLeafPress
}: {
    category: CategoryNode;
    onLeafPress: (name: string, rootCategory: string) => void;
}) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(category.children?.[0]?.id || null);

    // Deep hierarchy = any direct child has children of its own
    const isDeepHierarchy = category.children?.some(child => child.children && child.children.length > 0);

    // Handle press on any node — if it has children, drill into them; otherwise navigate
    const handleNodePress = (item: CategoryNode) => {
        onLeafPress(item.name, category.name);
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rightScroll}>
            <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
            </View>

            {isDeepHierarchy ? (
                category.children?.map((child) => {
                    const isExpanded = expandedSection === child.id;
                    return (
                        <View key={child.id} style={styles.level2Container}>
                            <TouchableOpacity
                                style={styles.level2Header}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setExpandedSection(isExpanded ? null : child.id);
                                }}
                            >
                                <Text style={styles.level2Title}>{child.name}</Text>
                                <Feather name={isExpanded ? 'chevron-down' : 'chevron-right'} size={20} color={Colors.light.tint} />
                            </TouchableOpacity>

                            {isExpanded && child.children && (
                                <View style={styles.level3Container}>
                                    {child.children.map((grandChild) => {
                                        if (grandChild.children && grandChild.children.length > 0) {
                                            // Has children → show as a titled grid section
                                            return (
                                                <CategoryGridSection
                                                    key={grandChild.id}
                                                    sectionTitle={grandChild.name}
                                                    items={grandChild.children}
                                                    onItemPress={handleNodePress}
                                                />
                                            );
                                        } else {
                                            // Leaf node — render inline as a single circle item
                                            return (
                                                <TouchableOpacity
                                                    key={grandChild.id}
                                                    style={styles.leafRow}
                                                    onPress={() => handleNodePress(grandChild)}
                                                >
                                                    <View style={[styles.circleImage, styles.highlightedBorder, styles.leafCircle]}>
                                                        <View style={{ backgroundColor: badgeColor(grandChild.name), flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
                                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                                                                {grandChild.name.charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.leafRowText}>{grandChild.name}</Text>
                                                    <Feather name="chevron-right" size={14} color="#ccc" />
                                                </TouchableOpacity>
                                            );
                                        }
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })
            ) : (
                // Flat hierarchy (Accessories, Beauty, Home) — direct grid
                <CategoryGridSection
                    items={category.children || []}
                    onItemPress={handleNodePress}
                />
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

// Collect ALL nodes at every level for search (not just leaves)
const getAllNodes = (nodes: CategoryNode[], parentName: string = ''): { name: string; category: string }[] => {
    let results: { name: string; category: string }[] = [];
    nodes.forEach(n => {
        results.push({ name: n.name, category: parentName });
        if (n.children) {
            results = [...results, ...getAllNodes(n.children, n.name)];
        }
    });
    return results;
};

export default function CategoriesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ categoryId?: string }>();
    const [selectedCategoryId, setSelectedCategoryId] = useState(params.categoryId || CATEGORY_DATA[0].id);
    const [searchQuery, setSearchQuery] = useState('');

    // Update selection if param changes
    React.useEffect(() => {
        if (params.categoryId) {
            setSelectedCategoryId(params.categoryId);
        }
    }, [params.categoryId]);

    const selectedCategory = CATEGORY_DATA.find(c => c.id === selectedCategoryId) || CATEGORY_DATA[0];

    const { addSearch } = useSearch();

    const handleLeafPress = (itemName: string, rootCategory: string) => {
        addSearch(itemName);
        router.push({
            pathname: '/product-listing',
            params: {
                categoryName: rootCategory,
                subCategoryName: itemName
            }
        });
    };

    const searchResults = React.useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        let all: { name: string; category: string; root: string }[] = [];
        CATEGORY_DATA.forEach(root => {
            if (root.children) {
                getAllNodes(root.children, root.name).forEach(l =>
                    all.push({ ...l, root: root.name })
                );
            }
        });
        // Deduplicate by name+root, filter by query
        const seen = new Set<string>();
        return all.filter(l => {
            const key = `${l.name}|${l.root}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
        });
    }, [searchQuery]);

    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {searchQuery.length > 0 ? (
                // Search Results
                <ScrollView contentContainerStyle={styles.searchScroll}>
                    {searchResults.length > 0 ? (
                        searchResults.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.searchItem}
                                onPress={() => handleLeafPress(item.name, item.root)}
                            >
                                <View>
                                    <Text style={styles.searchItemName}>{item.name}</Text>
                                    <Text style={styles.searchItemContext}>{item.root} &gt; {item.category}</Text>
                                </View>
                                <Feather name="arrow-up-right" size={16} color="#999" />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.noResults}>
                            <Text style={styles.noResultsText}>No categories found</Text>
                        </View>
                    )}
                </ScrollView>
            ) : (
                <View style={styles.contentContainer}>
                    <Sidebar
                        categories={CATEGORY_DATA}
                        selectedId={selectedCategoryId}
                        onSelect={setSelectedCategoryId}
                    />
                    <View style={styles.mainContent}>
                        <MainCategoryView
                            key={selectedCategory.id} // Force re-render on switch
                            category={selectedCategory}
                            onLeafPress={handleLeafPress}
                        />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchContainer: {
        marginBottom: 10,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    // Sidebar
    sidebar: {
        width: width * 0.25,
        backgroundColor: '#fff',
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    sidebarContent: {
        paddingBottom: 20,
        paddingTop: 10,
    },
    sidebarItem: {
        alignItems: 'center',
        paddingVertical: width * 0.05,
        paddingHorizontal: '2%',
        marginBottom: 5,
    },
    sidebarItemSelected: {
        backgroundColor: 'transparent',
    },
    sidebarIcon: {
        width: width * 0.125,
        height: width * 0.125,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    sidebarIconSelected: {
        backgroundColor: Colors.light.tint,
    },
    sidebarText: {
        fontSize: width * 0.025,
        textAlign: 'center',
        color: '#888',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    sidebarTextSelected: {
        color: '#000',
        fontWeight: '800',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: '30%',
        bottom: '30%',
        width: 3,
        backgroundColor: Colors.light.tint,
        borderTopRightRadius: 3,
        borderBottomRightRadius: 3,
    },
    // Main Content
    mainContent: {
        flex: 1,
        backgroundColor: '#FEFEFE',
    },
    categoryHeader: {
        paddingTop: width * 0.05,
        paddingHorizontal: width * 0.05,
        paddingBottom: width * 0.025,
    },
    categoryTitle: {
        fontSize: width * 0.07,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: width * 0.035,
        color: '#888',
        fontWeight: '500',
    },
    rightScroll: {
        paddingBottom: 50,
        paddingHorizontal: 0,
    },
    // Accordion / Sections
    level2Container: {
        marginBottom: 10,
        backgroundColor: '#F8F9FB',
        marginHorizontal: width * 0.038,
        borderRadius: 20,
        overflow: 'hidden',
        paddingBottom: 10,
    },
    level2Header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: width * 0.05,
    },
    level2Title: {
        fontSize: width * 0.045,
        fontWeight: '800',
        color: '#000',
    },
    level3Container: {
        paddingHorizontal: width * 0.038,
    },

    // Grid Section
    gridSection: {
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    gridSectionTitle: {
        fontSize: width * 0.03,
        fontWeight: '700',
        color: '#888',
        letterSpacing: 1,
    },
    seeAllText: {
        fontSize: width * 0.03,
        color: Colors.light.tint,
        fontWeight: '700',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    gridItemContainer: {
        width: '33.33%',
        alignItems: 'center',
        marginBottom: 15,
    },
    gridImageContainer: {
        marginBottom: 8,
        overflow: 'hidden',
    },
    circleImage: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_RADIUS,
        borderWidth: 2,
        borderColor: '#fff',
    },
    highlightedBorder: {
        borderColor: Colors.light.tint,
        borderWidth: 2,
    },
    rectImage: {
        width: RECT_WIDTH,
        height: RECT_HEIGHT,
        borderRadius: 12,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gridItemText: {
        fontSize: width * 0.028,
        color: '#333',
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    // Search
    searchScroll: { padding: width * 0.05 },
    searchItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: width * 0.038,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 10,
    },
    searchItemName: { fontSize: width * 0.035, fontWeight: '600', color: '#333' },
    searchItemContext: { fontSize: width * 0.025, color: '#999', marginTop: 2 },
    noResults: { alignItems: 'center', marginTop: 50 },
    noResultsText: { color: '#999' },
    // Leaf row
    leafRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: width * 0.025,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    leafCircle: {
        width: width * 0.1,
        height: width * 0.1,
        borderRadius: width * 0.05,
        marginRight: width * 0.03,
        overflow: 'hidden',
    },
    leafRowText: {
        flex: 1,
        fontSize: width * 0.033,
        fontWeight: '600',
        color: '#333',
    },
});
