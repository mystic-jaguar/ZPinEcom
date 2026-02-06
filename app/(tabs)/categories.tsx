import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import { CATEGORY_DATA, CategoryNode } from '../../constants/categories';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');

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
                                {cat.name.toUpperCase()}
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
    styleVariant = 'circle' // 'circle' | 'card'
}: {
    sectionTitle?: string;
    items: CategoryNode[];
    onItemPress: (item: CategoryNode) => void;
    styleVariant?: 'circle' | 'card';
}) => {
    if (!items || items.length === 0) return null;

    return (
        <View style={styles.gridSection}>
            {sectionTitle && (
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.gridSectionTitle}>{sectionTitle.toUpperCase()}</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>
            )}
            <View style={styles.gridContainer}>
                {items.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.gridItemContainer}
                        onPress={() => onItemPress(item)}
                    >
                        <View style={[
                            styles.gridImageContainer,
                            styleVariant === 'circle' ? styles.circleImage : styles.rectImage,
                            styleVariant === 'circle' && index === 0 && styles.highlightedBorder // Example highlight
                        ]}>
                            {item.image ? (
                                <Image source={item.image} style={styles.gridImage} />
                            ) : (
                                <View style={[styles.gridImage, { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Feather name="image" size={20} color="#ccc" />
                                </View>
                            )}
                        </View>
                        <Text style={styles.gridItemText} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
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
    // We expect the structure: Men (Level 2) -> Casual (Level 3) -> T-Shirts (Level 4/Leaf)    
    // OR: Men -> Casual -> T-Shirts -> Leaf. The grid should show the "Items" with images.

    // Flatten logic: 
    // If category has children, we iterate them.
    // If Child has children, we render Child.Name as Section Logic, and Grandchildren as Grid.

    // Example: Men (category) -> Casual (child) -> T-Shirts, Shirts (grandchild)

    const [expandedSection, setExpandedSection] = useState<string | null>(category.children?.[0]?.id || null);

    // Check if we shoud render accordions (Level 2) or just a direct grid (Level 1)
    // If any child has children, we assume it's a deep hierarchy (Fashion -> Men -> ...).
    // If no child has children, it's a flat hierarchy (Accessories -> Bags, Wallets...).
    const isDeepHierarchy = category.children?.some(child => child.children && child.children.length > 0);

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rightScroll}>
            {/* Header */}
            <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                {category.id === 'fashion' && (
                    <Text style={styles.categorySubtitle}>Explore Collections</Text>
                )}
            </View>

            {isDeepHierarchy ? (
                // Deep Hierarchy: Render Level 2 Accordions (e.g. Men, Women)
                category.children?.map((child) => {
                    const isExpanded = expandedSection === child.id;
                    return (
                        <View key={child.id} style={styles.level2Container}>
                            {/* Level 2 Header (Collapsible) */}
                            <TouchableOpacity
                                style={styles.level2Header}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setExpandedSection(isExpanded ? null : child.id);
                                }}
                            >
                                <Text style={styles.level2Title}>{child.name}</Text>
                                <Feather name={isExpanded ? "chevron-down" : "chevron-right"} size={20} color={Colors.light.tint} />
                            </TouchableOpacity>

                            {isExpanded && child.children && (
                                <View style={styles.level3Container}>
                                    {child.children.map((grandChild) => {
                                        // Level 3 Node (e.g. Casual Essentials)
                                        // Check if this node has children to display as grid
                                        if (grandChild.children && grandChild.children.length > 0) {
                                            // Determined Style Variant based on name/context
                                            const variant = grandChild.name.toLowerCase().includes('ethnic') ? 'card' : 'circle';

                                            return (
                                                <CategoryGridSection
                                                    key={grandChild.id}
                                                    sectionTitle={grandChild.name}
                                                    items={grandChild.children || []} // T-Shirts, Shirts...
                                                    styleVariant={variant}
                                                    onItemPress={(item) => onLeafPress(item.name, category.name)}
                                                />
                                            );
                                        } else {
                                            return null;
                                        }
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })
            ) : (
                // Flat Hierarchy: Render direct Grid (e.g. Accessories -> Bags, Wallets)
                <CategoryGridSection
                    // sectionTitle omitted to hide header
                    items={category.children || []}
                    onItemPress={(item) => onLeafPress(item.name, category.name)}
                    styleVariant="circle"
                />
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

export default function CategoriesScreen() {
    const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORY_DATA[0].id);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const selectedCategory = CATEGORY_DATA.find(c => c.id === selectedCategoryId) || CATEGORY_DATA[0];

    const handleLeafPress = (itemName: string, rootCategory: string) => {
        router.push({
            pathname: '/product-listing',
            params: {
                categoryName: rootCategory,
                subCategoryName: itemName
            }
        });
    };

    // Helper to flatten for search (same as before)
    const getAllLeaves = (nodes: CategoryNode[], parentName: string = ''): { name: string, category: string }[] => {
        let leaves: { name: string, category: string }[] = [];
        nodes.forEach(node => {
            if (!node.children || node.children.length === 0) {
                // If it has image, likely a visual leaf.
                leaves.push({ name: node.name, category: parentName });
            } else {
                leaves = [...leaves, ...getAllLeaves(node.children, node.name)];
            }
        });
        return leaves;
    };

    const searchResults = React.useMemo(() => {
        if (!searchQuery) return [];
        let allLeaves: { name: string, category: string, root: string }[] = [];
        CATEGORY_DATA.forEach(root => {
            if (root.children) {
                const rootLeaves = getAllLeaves(root.children, root.name);
                rootLeaves.forEach(l => allLeaves.push({ ...l, root: root.name }));
            }
        });

        return allLeaves.filter(l =>
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
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
        marginBottom: 10
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    // Sidebar
    sidebar: {
        width: 100, // Slightly wider
        backgroundColor: '#fff', // White sidebar per design
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    sidebarContent: {
        paddingBottom: 20,
        paddingTop: 10
    },
    sidebarItem: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 4,
        marginBottom: 5
    },
    sidebarItemSelected: {
        backgroundColor: 'transparent',
    },
    sidebarIcon: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    sidebarIconSelected: {
        backgroundColor: Colors.light.tint, // Yellow bg
    },
    sidebarText: {
        fontSize: 10,
        textAlign: 'center',
        color: '#888',
        fontWeight: '600',
        letterSpacing: 0.5
    },
    sidebarTextSelected: {
        color: '#000',
        fontWeight: '800'
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 25,
        bottom: 25,
        width: 3,
        backgroundColor: Colors.light.tint,
        borderTopRightRadius: 3,
        borderBottomRightRadius: 3
    },
    // Main Content
    mainContent: {
        flex: 1,
        backgroundColor: '#FEFEFE'
    },
    categoryHeader: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    categoryTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
        marginBottom: 4
    },
    categorySubtitle: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500'
    },
    rightScroll: {
        paddingBottom: 50,
        paddingHorizontal: 0
    },
    // Accordion / Sections
    level2Container: {
        marginBottom: 10,
        backgroundColor: '#F8F9FB',
        marginHorizontal: 15,
        borderRadius: 20,
        overflow: 'hidden',
        paddingBottom: 10
    },
    level2Header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    level2Title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000'
    },
    level3Container: {
        paddingHorizontal: 15
    },

    // Grid Section
    gridSection: {
        marginBottom: 20
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5
    },
    gridSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#888',
        letterSpacing: 1
    },
    seeAllText: {
        fontSize: 12,
        color: Colors.light.tint,
        fontWeight: '700'
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
    },
    gridItemContainer: {
        width: '33.33%',
        alignItems: 'center',
        marginBottom: 15
    },
    gridImageContainer: {
        marginBottom: 8,
        overflow: 'hidden',
    },
    circleImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#fff' // Default
    },
    highlightedBorder: {
        borderColor: Colors.light.tint,
        borderWidth: 2
    },
    rectImage: {
        width: 70,
        height: 85,
        borderRadius: 12,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    gridItemText: {
        fontSize: 11,
        color: '#333',
        fontWeight: '600',
        textAlign: 'center'
    },
    // Search
    searchScroll: { padding: 20 },
    searchItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 10
    },
    searchItemName: { fontSize: 14, fontWeight: '600', color: '#333' },
    searchItemContext: { fontSize: 10, color: '#999', marginTop: 2 },
    noResults: { alignItems: 'center', marginTop: 50 },
    noResultsText: { color: '#999' }
});
