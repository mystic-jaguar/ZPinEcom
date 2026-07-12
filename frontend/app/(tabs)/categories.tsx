import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronRight, Search, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Image, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ZText } from '../../components/ui';
import { CATEGORY_DATA, CategoryNode } from '../../constants/categories';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useSearch } from '../../context/SearchContext';

// Landing-card artwork + unit noun per root category (reused from home).
const CATEGORY_META: Record<string, { image: any; unit: string }> = {
    fashion: { image: { uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80' }, unit: 'styles' },
    footwear: { image: { uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80' }, unit: 'pairs' },
    accessories: { image: { uri: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80' }, unit: 'items' },
    beauty: { image: require('../../assets/images/beauty_icon.jpg'), unit: 'items' },
    home: { image: { uri: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=500&q=80' }, unit: 'items' },
};

// Curated quick-access subcategories under Fashion.
const POPULAR = [
    { name: 'T-Shirts', root: 'Fashion' },
    { name: 'Jeans', root: 'Fashion' },
    { name: 'Kurtas', root: 'Fashion' },
    { name: 'Dresses', root: 'Fashion' },
    { name: 'Co-Ords', root: 'Fashion' },
    { name: 'Jackets', root: 'Fashion' },
];

// Real count of leaf subcategories under a node — a decorative-but-honest tally.
const countLeaves = (n: CategoryNode): number =>
    n.children && n.children.length ? n.children.reduce((s, c) => s + countLeaves(c), 0) : 1;

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');

const LEVEL2_MARGIN = Math.round(width * 0.038);
const LEVEL3_PADDING = Math.round(width * 0.038);
const NUM_COLUMNS = 3;

const maxGridWidth = width - (LEVEL2_MARGIN * 2) - (LEVEL3_PADDING * 2);
const columnWidth = maxGridWidth / NUM_COLUMNS;

const CIRCLE_SIZE = Math.min(70, Math.floor(columnWidth - 12));
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const RECT_WIDTH = CIRCLE_SIZE;
const RECT_HEIGHT = Math.floor(CIRCLE_SIZE * (85 / 70));

// Card-grid landing (matches design doc): a hero feature tile for the first
// category, an image grid for the rest, and popular quick-access chips.
const CategoryLanding = ({ onOpen, onPopular }: { onOpen: (cat: CategoryNode) => void; onPopular: (name: string, root: string) => void; }) => {
    const [feature, ...rest] = CATEGORY_DATA;
    const featMeta = CATEGORY_META[feature.id];
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.landingScroll}>
            {/* Feature tile */}
            <TouchableOpacity activeOpacity={0.9} style={styles.featureTile} onPress={() => onOpen(feature)}>
                <Image source={featMeta?.image} style={styles.featureImage} />
                <LinearGradient
                    colors={['rgba(14,13,11,0.78)', 'rgba(14,13,11,0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.featureBadge}>
                    <Zap size={11} color={colors.textOnYellow} fill={colors.textOnYellow} />
                    <Text style={styles.featureBadgeText}>TRY-AT-DOOR</Text>
                </View>
                <View style={styles.featureCaption}>
                    <Text style={styles.featureCount}>{countLeaves(feature)} {featMeta?.unit}</Text>
                    <Text style={styles.featureTitle}>{feature.name}</Text>
                </View>
                <View style={styles.featureArrow}>
                    <ArrowUpRight size={22} color={colors.textOnYellow} />
                </View>
            </TouchableOpacity>

            {/* Grid of remaining categories */}
            <View style={styles.landingGrid}>
                {rest.map((cat) => {
                    const meta = CATEGORY_META[cat.id];
                    return (
                        <TouchableOpacity key={cat.id} activeOpacity={0.9} style={styles.landingCard} onPress={() => onOpen(cat)}>
                            <Image source={meta?.image} style={styles.landingCardImage} />
                            <LinearGradient
                                colors={['rgba(14,13,11,0.72)', 'transparent']}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 0, y: 0.38 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.landingCardCaption}>
                                <Text style={styles.landingCardTitle} numberOfLines={1}>{cat.name}</Text>
                                <Text style={styles.landingCardCount}>{countLeaves(cat)} {(meta?.unit || 'items').toUpperCase()}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Popular chips */}
            <Text style={styles.popularLabel}>Popular in Fashion</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
                {POPULAR.map((p) => (
                    <TouchableOpacity key={p.name} style={styles.popularChip} onPress={() => onPopular(p.name, p.root)}>
                        <Text style={styles.popularChipText}>{p.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <View style={{ height: 120 }} />
        </ScrollView>
    );
};

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
    // null = card-grid landing; an id = drilled into that category's subcategories.
    const [drilledId, setDrilledId] = useState<string | null>(params.categoryId || null);
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        if (params.categoryId) setDrilledId(params.categoryId);
    }, [params.categoryId]);

    const drilledCategory = drilledId ? CATEGORY_DATA.find(c => c.id === drilledId) : null;
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
            {drilledCategory && searchQuery.length === 0 ? (
                <View style={styles.titleBlock}>
                    <TouchableOpacity style={styles.backRow} onPress={() => setDrilledId(null)} activeOpacity={0.7}>
                        <ArrowLeft size={20} color={colors.textStrong} />
                        <Text style={styles.backLabel}>All categories</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.titleBlock}>
                    <View style={styles.eyebrowRow}>
                        <Zap size={12} color={palette.yellow500} fill={palette.yellow500} />
                        <ZText variant="eyebrow" color={colors.textMuted}>Browse the city</ZText>
                    </View>
                    <ZText variant="h2">Categories</ZText>
                </View>
            )}

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
            ) : drilledCategory ? (
                <View style={styles.mainContent}>
                    <MainCategoryView key={drilledCategory.id} category={drilledCategory} onLeafPress={handleLeafPress} />
                </View>
            ) : (
                <CategoryLanding onOpen={(cat) => setDrilledId(cat.id)} onPopular={handleLeafPress} />
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

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textStrong },

    // Card-grid landing
    landingScroll: { paddingHorizontal: 20, paddingBottom: 40 },
    featureTile: { height: 186, borderRadius: 24, overflow: 'hidden', marginBottom: 14 },
    featureImage: { width: '100%', height: '100%' },
    featureBadge: { position: 'absolute', left: 16, top: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.yellow500, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 100 },
    featureBadgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1, color: colors.textOnYellow },
    featureCaption: { position: 'absolute', left: 18, bottom: 16 },
    featureCount: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.4, color: palette.yellow400, textTransform: 'uppercase', marginBottom: 6 },
    featureTitle: { fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: -0.6, color: colors.textInvert },
    featureArrow: { position: 'absolute', right: 16, bottom: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' },

    landingGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
    landingCard: { width: '48%', height: 150, borderRadius: 22, overflow: 'hidden' },
    landingCardImage: { width: '100%', height: '100%' },
    landingCardCaption: { position: 'absolute', left: 14, bottom: 13, right: 14 },
    landingCardTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.textInvert },
    landingCardCount: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.8, color: palette.neutral200 },

    popularLabel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted, textTransform: 'uppercase', marginTop: 26, marginBottom: 14 },
    popularRow: { gap: 10, paddingRight: 20 },
    popularChip: { backgroundColor: colors.surfaceCard, borderWidth: 2, borderColor: colors.borderSubtle, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 100 },
    popularChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody },

    mainContent: { flex: 1, backgroundColor: palette.paperWarm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
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
