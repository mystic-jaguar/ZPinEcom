import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpRight, ChevronDown, ChevronRight, Search, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Image, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ZText } from '../../components/ui';
import { CATEGORY_DATA, CategoryNode } from '../../constants/categories';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useSearch } from '../../context/SearchContext';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');

const SIDEBAR_WIDTH = Math.round(width * 0.25);
const LEVEL2_MARGIN = Math.round(width * 0.038);
const LEVEL3_PADDING = Math.round(width * 0.038);
const NUM_COLUMNS = 3;

const maxGridWidth = width - SIDEBAR_WIDTH - (LEVEL2_MARGIN * 2) - (LEVEL3_PADDING * 2);
const columnWidth = maxGridWidth / NUM_COLUMNS;

const CIRCLE_SIZE = Math.min(70, Math.floor(columnWidth - 12));
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const RECT_WIDTH = CIRCLE_SIZE;
const RECT_HEIGHT = Math.floor(CIRCLE_SIZE * (85 / 70));

const Sidebar = ({ categories, selectedId, onSelect }: { categories: CategoryNode[]; selectedId: string; onSelect: (id: string) => void; }) => (
    <View style={styles.sidebar}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
            {categories.map((cat) => {
                const isSelected = selectedId === cat.id;
                return (
                    <TouchableOpacity key={cat.id} style={styles.sidebarItem} onPress={() => onSelect(cat.id)} activeOpacity={0.8}>
                        <View style={[styles.sidebarIcon, isSelected && styles.sidebarIconSelected]}>
                            <Feather name={cat.icon as any || 'circle'} size={20} color={isSelected ? colors.textOnYellow : colors.textMuted} />
                        </View>
                        <Text style={[styles.sidebarText, isSelected && styles.sidebarTextSelected]}>{cat.name}</Text>
                        {isSelected && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    </View>
);

const CategoryGridSection = ({ sectionTitle, items, onItemPress }: { sectionTitle?: string; items: CategoryNode[]; onItemPress: (item: CategoryNode) => void; }) => {
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
                    const hasChildren = item.children && item.children.length > 0;
                    const useRect = hasChildren && !!item.image;
                    return (
                        <TouchableOpacity key={item.id} style={styles.gridItemContainer} onPress={() => onItemPress(item)}>
                            <View style={[styles.gridImageContainer, useRect ? styles.rectImage : styles.circleImage, !useRect && styles.highlightedBorder]}>
                                {item.image ? (
                                    <Image source={item.image} style={styles.gridImage} />
                                ) : (
                                    <View style={[styles.gridImage, styles.placeholder]}>
                                        <Text style={styles.placeholderText} numberOfLines={2}>{item.name.charAt(0).toUpperCase()}</Text>
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

const MainCategoryView = ({ category, onLeafPress }: { category: CategoryNode; onLeafPress: (name: string, rootCategory: string) => void; }) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(category.children?.[0]?.id || null);
    const isDeepHierarchy = category.children?.some(child => child.children && child.children.length > 0);
    const handleNodePress = (item: CategoryNode) => onLeafPress(item.name, category.name);

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
                                {isExpanded ? <ChevronDown size={20} color={palette.yellow600} /> : <ChevronRight size={20} color={palette.yellow600} />}
                            </TouchableOpacity>
                            {isExpanded && child.children && (
                                <View style={styles.level3Container}>
                                    {child.children.map((grandChild) => {
                                        if (grandChild.children && grandChild.children.length > 0) {
                                            return <CategoryGridSection key={grandChild.id} sectionTitle={grandChild.name} items={grandChild.children} onItemPress={handleNodePress} />;
                                        }
                                        return (
                                            <TouchableOpacity key={grandChild.id} style={styles.leafRow} onPress={() => handleNodePress(grandChild)}>
                                                <View style={[styles.circleImage, styles.highlightedBorder, styles.leafCircle]}>
                                                    <View style={styles.leafPlaceholder}>
                                                        <Text style={styles.placeholderText}>{grandChild.name.charAt(0).toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.leafRowText}>{grandChild.name}</Text>
                                                <ChevronRight size={14} color={colors.borderStrong} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })
            ) : (
                <CategoryGridSection items={category.children || []} onItemPress={handleNodePress} />
            )}
            <View style={{ height: 120 }} />
        </ScrollView>
    );
};

const getAllNodes = (nodes: CategoryNode[], parentName: string = ''): { name: string; category: string }[] => {
    let results: { name: string; category: string }[] = [];
    nodes.forEach(n => {
        results.push({ name: n.name, category: parentName });
        if (n.children) results = [...results, ...getAllNodes(n.children, n.name)];
    });
    return results;
};

export default function CategoriesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ categoryId?: string }>();
    const [selectedCategoryId, setSelectedCategoryId] = useState(params.categoryId || CATEGORY_DATA[0].id);
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        if (params.categoryId) setSelectedCategoryId(params.categoryId);
    }, [params.categoryId]);

    const selectedCategory = CATEGORY_DATA.find(c => c.id === selectedCategoryId) || CATEGORY_DATA[0];
    const { addSearch } = useSearch();

    const handleLeafPress = (itemName: string, rootCategory: string) => {
        addSearch(itemName);
        router.push({ pathname: '/product-listing', params: { categoryName: rootCategory, subCategoryName: itemName } });
    };

    const searchResults = React.useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        let all: { name: string; category: string; root: string }[] = [];
        CATEGORY_DATA.forEach(root => {
            if (root.children) getAllNodes(root.children, root.name).forEach(l => all.push({ ...l, root: root.name }));
        });
        const seen = new Set<string>();
        return all.filter(l => {
            const key = `${l.name}|${l.root}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
        });
    }, [searchQuery]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.titleBlock}>
                <View style={styles.eyebrowRow}>
                    <Zap size={12} color={palette.yellow500} fill={palette.yellow500} />
                    <ZText variant="eyebrow" color={colors.textMuted}>Browse the city</ZText>
                </View>
                <ZText variant="h2">Categories</ZText>
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.search}>
                    <Search size={19} color={colors.textFaint} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search categories"
                        placeholderTextColor={colors.textFaint}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {searchQuery.length > 0 ? (
                <ScrollView contentContainerStyle={styles.searchScroll}>
                    {searchResults.length > 0 ? (
                        searchResults.map((item, index) => (
                            <TouchableOpacity key={index} style={styles.searchItem} onPress={() => handleLeafPress(item.name, item.root)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.searchItemName}>{item.name}</Text>
                                    <Text style={styles.searchItemContext}>{item.root} › {item.category}</Text>
                                </View>
                                <ArrowUpRight size={16} color={colors.textFaint} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.noResults}><Text style={styles.noResultsText}>No categories found</Text></View>
                    )}
                </ScrollView>
            ) : (
                <View style={styles.contentContainer}>
                    <Sidebar categories={CATEGORY_DATA} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
                    <View style={styles.mainContent}>
                        <MainCategoryView key={selectedCategory.id} category={selectedCategory} onLeafPress={handleLeafPress} />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    titleBlock: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },

    searchWrap: { paddingHorizontal: 20, paddingBottom: 16 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, height: 50, paddingHorizontal: 16 },
    searchInput: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.textStrong, padding: 0 },

    contentContainer: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.borderSubtle },
    sidebar: { width: width * 0.25, backgroundColor: colors.surfaceCard, borderRightWidth: 1, borderRightColor: colors.borderSubtle },
    sidebarContent: { paddingBottom: 120, paddingTop: 10 },
    sidebarItem: { alignItems: 'center', paddingVertical: width * 0.05, paddingHorizontal: '2%', marginBottom: 5 },
    sidebarIcon: { width: width * 0.125, height: width * 0.125, borderRadius: 16, backgroundColor: colors.surfaceSunken, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    sidebarIconSelected: { backgroundColor: palette.yellow500 },
    sidebarText: { fontFamily: fonts.bodySemiBold, fontSize: 11, textAlign: 'center', color: colors.textMuted },
    sidebarTextSelected: { color: colors.textStrong, fontFamily: fonts.bodyBold },
    activeIndicator: { position: 'absolute', left: 0, top: '30%', bottom: '30%', width: 3, backgroundColor: palette.yellow500, borderTopRightRadius: 3, borderBottomRightRadius: 3 },

    mainContent: { flex: 1, backgroundColor: palette.paperWarm },
    categoryHeader: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 10 },
    categoryTitle: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -0.8, color: colors.textStrong },
    rightScroll: { paddingBottom: 50 },

    level2Container: { marginBottom: 10, backgroundColor: colors.surfaceCard, marginHorizontal: LEVEL2_MARGIN, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.neutral200, overflow: 'hidden', paddingBottom: 10 },
    level2Header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
    level2Title: { fontFamily: fonts.displaySemiBold, fontSize: 17, color: colors.textStrong },
    level3Container: { paddingHorizontal: LEVEL3_PADDING },

    gridSection: { marginBottom: 20 },
    sectionHeaderRow: { marginBottom: 14, paddingHorizontal: 5 },
    gridSectionTitle: { fontFamily: fonts.monoBold, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    gridItemContainer: { width: '33.33%', alignItems: 'center', marginBottom: 15 },
    gridImageContainer: { marginBottom: 8, overflow: 'hidden' },
    circleImage: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_RADIUS, borderWidth: 2, borderColor: colors.surfaceCard },
    highlightedBorder: { borderColor: palette.yellow500, borderWidth: 2 },
    rectImage: { width: RECT_WIDTH, height: RECT_HEIGHT, borderRadius: 12 },
    gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textFaint, textAlign: 'center' },
    gridItemText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textBody, textAlign: 'center', paddingHorizontal: 2 },

    searchScroll: { padding: 20, paddingBottom: 120 },
    searchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.md, marginBottom: 10 },
    searchItemName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textStrong },
    searchItemContext: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    noResults: { alignItems: 'center', marginTop: 50 },
    noResultsText: { fontFamily: fonts.bodyRegular, color: colors.textMuted },

    leafRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: palette.neutral100 },
    leafCircle: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
    leafPlaceholder: { backgroundColor: colors.surfaceSunken, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    leafRowText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textBody },
});
