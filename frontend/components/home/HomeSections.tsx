import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowRight, Briefcase, Clock, Footprints, Glasses, Lamp, Shirt, ShoppingBag, Watch } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { createStyles, colors, fonts, palette, radius, s } from '../../constants/theme';
import { FlashDeal } from '../../services/flashDeals';
import { productService } from '../../services/product';
import { Text } from '../ui/ScaledText';

/**
 * The website homepage's three editorial mega-sections (Explore Categories,
 * Essentials, Discover), ported to the app.
 *
 * Everything here reads endpoints the app already calls — products/category/:name
 * and flash-deals — so no backend work was needed. Copy, kickers and section order
 * follow website-customer/src/Homepage.jsx; the layout is rebuilt for a phone
 * (stacked bento instead of side-by-side, horizontal rows instead of 5-up grids).
 *
 * ponytail: category names are hardcoded to constants/categories.ts entries rather
 * than driven by a CMS — the website hardcodes them too. Wire them to admin-authored
 * content only if merchandising ever needs to change them without a build.
 */

type Item = { id: string; name: string; price: number; image: string; nav: NavTarget };
type NavTarget = { productId?: string; categoryName?: string; subCategoryName?: string };

const useNav = () => {
    const router = useRouter();
    return (t: NavTarget) => {
        if (t.productId) { router.push(`/product/${t.productId}` as any); return; }
        router.push({ pathname: '/product-listing', params: { categoryName: t.categoryName, subCategoryName: t.subCategoryName } });
    };
};

const fmt = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Live products for one category, falling back to the supplied editorial set when
 * the category is thin — same rule as the website (fall back below `min` items),
 * so a half-stocked catalogue never renders a section with two lonely cards.
 */
function useCategoryItems(category: string, limit: number, fallback: Item[], min: number): Item[] {
    const [items, setItems] = useState<Item[]>(fallback);

    useEffect(() => {
        let cancelled = false;
        productService.getProductsByCategory(category, { limit })
            .then(res => {
                if (cancelled) return;
                const live = (res.products || []).slice(0, limit);
                if (live.length < min) return; // keep the fallback
                setItems(live.map((p: any) => ({
                    id: String(p.productId),
                    name: p.productName,
                    price: Number(p.price) || 0,
                    image: typeof p.images?.[0] === 'string' ? p.images[0] : '',
                    nav: { productId: String(p.productId) },
                })));
            })
            .catch(() => { /* keep the fallback set */ });
        return () => { cancelled = true; };
    }, [category, limit, min, fallback]);

    return items;
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

/**
 * Kicker / title+action / sub, as one block so every line shares a left edge.
 *
 * `inset` is for headers that sit inside a bordered card (essentialCard), whose
 * body padding is 16 — without it the header sat flush against the card edge while
 * the sub line and the product row were indented.
 *
 * The action is a plain Text, not a Pressable, so `alignItems: 'baseline'` has two
 * real text baselines to align (Yoga gives a View its bottom edge instead, which
 * left "View All" floating above the title).
 */
function RowHeader({ kicker, title, sub, actionLabel, onAction, inset }: { kicker?: string; title: string; sub?: string; actionLabel?: string; onAction?: () => void; inset?: boolean }) {
    return (
        <View style={[styles.rowHeader, inset && styles.rowHeaderInset]}>
            {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
            <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle}>{title}</Text>
                {!!actionLabel && (
                    <Text style={styles.viewAll} onPress={onAction} suppressHighlighting>{actionLabel} →</Text>
                )}
            </View>
            {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
    );
}

/** Small square product tile used by the "drops" and "essentials" rows. */
function MiniCard({ item, onPress, width }: { item: Item; onPress: () => void; width: number }) {
    return (
        <Pressable style={[styles.mini, { width }]} onPress={onPress}>
            <View style={styles.miniImageWrap}>
                {!!item.image && <Image source={{ uri: item.image }} style={styles.miniImage} contentFit="cover" transition={150} />}
            </View>
            <Text style={styles.miniName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.miniPrice}>{fmt(item.price)}</Text>
        </Pressable>
    );
}

/* ── Explore Categories ──────────────────────────────────────────────────── */

const ETHNIC_FALLBACK: Item[] = [
    { id: 'e1', name: 'Chikankari Kurta Set', price: 1499, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Ethnic' } },
    { id: 'e2', name: 'Banarasi Silk Saree', price: 2542, image: 'https://images.unsplash.com/photo-1610189844202-5c9d1b4cdbcc?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Ethnic' } },
    { id: 'e3', name: 'Nehru Jacket', price: 1299, image: 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Ethnic' } },
    { id: 'e4', name: 'Anarkali Gown', price: 1989, image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Ethnic' } },
    { id: 'e5', name: 'Printed Short Kurta', price: 899, image: 'https://images.unsplash.com/photo-1564859228273-274232fdb516?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Ethnic' } },
    { id: 'e6', name: 'Festive Lehenga', price: 3699, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Ethnic' } },
];

const TECH_FALLBACK: Item[] = [
    { id: 't1', name: 'Smart Watch Series X', price: 1690, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop', nav: { categoryName: 'Accessories', subCategoryName: 'Watches' } },
    { id: 't2', name: 'Analog Classic', price: 1290, image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&auto=format&fit=crop', nav: { categoryName: 'Accessories', subCategoryName: 'Watches' } },
    { id: 't3', name: 'Sports Chronograph', price: 1699, image: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&auto=format&fit=crop', nav: { categoryName: 'Accessories', subCategoryName: 'Watches' } },
    { id: 't4', name: 'Digital Fitness Band', price: 795, image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&auto=format&fit=crop', nav: { categoryName: 'Accessories', subCategoryName: 'Watches' } },
];

const SMALL_TILES: { tag: string; label: string; sub: string; img: string; nav: NavTarget }[] = [
    { tag: 'TOP PICKS', label: 'Footwear', sub: 'Sneakers, shoes & more', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop', nav: { categoryName: 'Footwear' } },
    { tag: 'LATEST', label: 'Accessories', sub: 'Bags, watches & eyewear', img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&auto=format&fit=crop', nav: { categoryName: 'Accessories' } },
    { tag: 'HANDPICKED', label: 'Home & Living', sub: 'Décor, storage & more', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
    { tag: 'GLOW UP', label: 'Beauty', sub: 'Skincare, makeup & care', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&auto=format&fit=crop', nav: { categoryName: 'Beauty' } },
];

const WIDE_TILES: { tag: string; label: string; sub: string; img: string; nav: NavTarget }[] = [
    { tag: 'NEW SEASON', label: 'Casual Wear', sub: 'Fresh fits for everyday ease.', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Casual' } },
    { tag: 'ACTIVE LIFE', label: 'Sportswear', sub: 'Gear that moves with you.', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion', subCategoryName: 'Sportswear' } },
];

export function ExploreCategories() {
    const go = useNav();
    const ethnic = useCategoryItems('Ethnic', 6, ETHNIC_FALLBACK, 4);
    const tech = useCategoryItems('Watches', 4, TECH_FALLBACK, 2);
    const dropWidth = s(150);

    return (
        <View style={styles.section}>
            <View style={styles.sectionHead}>
                <Text style={styles.kicker}>SHOP BY STYLE · DISCOVER BY INTEREST</Text>
                <Text style={styles.sectionTitle}>Explore Categories</Text>
                <Text style={styles.sectionSub}>Find what inspires you.</Text>
            </View>

            {/* Hero — Ethnic & Fusion Wear */}
            <Pressable style={styles.heroCard} onPress={() => go({ categoryName: 'Fashion', subCategoryName: 'Ethnic' })}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop' }}
                    style={styles.heroImage}
                    contentFit="cover"
                />
                <View style={styles.heroScrim} />
                <View style={styles.heroBody}>
                    <View style={[styles.heroTag, { backgroundColor: palette.warning500 }]}>
                        <Text style={styles.heroTagText}>CULTURE & STYLE</Text>
                    </View>
                    <Text style={styles.heroTitle}>Ethnic & Fusion Wear</Text>
                    <Text style={styles.heroDesc}>Rooted in culture, reimagined for you.</Text>
                    <View style={styles.heroCta}>
                        <Text style={styles.heroCtaText}>Shop up to 55%</Text>
                        <ArrowRight size={s(14)} color={colors.textOnYellow} />
                    </View>
                </View>
            </Pressable>

            {/* 2x2 small tiles */}
            <View style={styles.tileGrid}>
                {SMALL_TILES.map(t => (
                    <Pressable key={t.label} style={styles.tile} onPress={() => go(t.nav)}>
                        <Image source={{ uri: t.img }} style={styles.tileImage} contentFit="cover" />
                        <View style={styles.tileBody}>
                            <Text style={styles.tileTag}>{t.tag}</Text>
                            <Text style={styles.tileTitle} numberOfLines={1}>{t.label}</Text>
                            <Text style={[styles.tileSub, styles.tileSubGrid]} numberOfLines={2}>{t.sub}</Text>
                            <Text style={styles.tileExplore}>Explore →</Text>
                        </View>
                    </Pressable>
                ))}
            </View>

            {/* Hero — Holistic Wellness */}
            <Pressable style={[styles.heroCard, styles.heroSpaced]} onPress={() => go({ categoryName: 'Beauty', subCategoryName: 'Skincare' })}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop' }}
                    style={styles.heroImage}
                    contentFit="cover"
                />
                <View style={styles.heroScrim} />
                <View style={styles.heroBody}>
                    <View style={[styles.heroTag, { backgroundColor: '#8b5cf6' }]}>
                        <Text style={styles.heroTagText}>WELLNESS</Text>
                    </View>
                    <Text style={styles.heroTitle}>Holistic Wellness</Text>
                    <Text style={styles.heroDesc}>Elevate your mind, body & everyday life.</Text>
                    <View style={styles.heroCta}>
                        <Text style={styles.heroCtaText}>Shop up to 40%</Text>
                        <ArrowRight size={s(14)} color={colors.textOnYellow} />
                    </View>
                </View>
            </Pressable>

            {/* Wide tiles */}
            {WIDE_TILES.map(t => (
                <Pressable key={t.label} style={styles.wideTile} onPress={() => go(t.nav)}>
                    <Image source={{ uri: t.img }} style={styles.wideTileImage} contentFit="cover" />
                    <View style={styles.wideTileBody}>
                        <Text style={styles.tileTag}>{t.tag}</Text>
                        <Text style={styles.tileTitle}>{t.label}</Text>
                        <Text style={styles.tileSub} numberOfLines={1}>{t.sub}</Text>
                        <Text style={styles.tileExplore}>Explore →</Text>
                    </View>
                </Pressable>
            ))}

            {/* New arrivals banner */}
            <Pressable style={styles.arrivals} onPress={() => go({ categoryName: 'Fashion', subCategoryName: 'Western' })}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop' }}
                    style={styles.arrivalsImage}
                    contentFit="cover"
                />
                <View style={styles.arrivalsScrim} />
                <View style={styles.arrivalsBody}>
                    <Text style={styles.arrivalsTag}>NEW SEASON</Text>
                    <Text style={styles.arrivalsTitle}>The New <Text style={{ color: palette.yellow500 }}>ZPIN</Text> Arrivals</Text>
                    <Text style={styles.arrivalsSub}>Premium picks, fresh styles & exclusive offers.</Text>
                    <View style={styles.arrivalsCta}><Text style={styles.arrivalsCtaText}>Shop Collection</Text></View>
                </View>
            </Pressable>

            {/* Ethnic Drops */}
            <View style={styles.rowBlock}>
                <RowHeader
                    kicker="HANDPICKED STYLES FOR YOU"
                    title="Ethnic Drops"
                    actionLabel="View All"
                    onAction={() => go({ categoryName: 'Fashion', subCategoryName: 'Ethnic' })}
                />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                {ethnic.map(item => <MiniCard key={item.id} item={item} width={dropWidth} onPress={() => go(item.nav)} />)}
            </ScrollView>

            {/* Editorial duo */}
            <View style={styles.editorialRow}>
                {[
                    { title: 'Luxe Living', sub: 'Premium comfort for your space and style.', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } as NavTarget },
                    { title: 'The Detail Room', sub: 'Discover pieces that make life better.', img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop', nav: { categoryName: 'Accessories' } as NavTarget },
                ].map(e => (
                    <Pressable key={e.title} style={styles.editorialCard} onPress={() => go(e.nav)}>
                        <Image source={{ uri: e.img }} style={styles.editorialImage} contentFit="cover" />
                        <View style={styles.editorialBody}>
                            <Text style={styles.editorialTitle}>{e.title}</Text>
                            <Text style={styles.editorialSub} numberOfLines={2}>{e.sub}</Text>
                            <Text style={styles.tileExplore}>Explore Now →</Text>
                        </View>
                    </Pressable>
                ))}
            </View>

            {/* Mastering the Everyday */}
            <View style={styles.feature}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&auto=format&fit=crop' }}
                    style={styles.featureImage}
                    contentFit="cover"
                />
                <View style={styles.featureBody}>
                    <Text style={styles.kicker}>EDITORIAL</Text>
                    <Text style={styles.featureTitle}>Mastering the Everyday</Text>
                    <Text style={styles.featureDesc}>Tips, ideas & inspiration to elevate the way you live and shop.</Text>
                    {[
                        { head: 'Layer Your Look', body: 'Build your outfits with balance & style.' },
                        { head: 'Accessorise Right', body: 'The perfect accessories transform any look.' },
                    ].map(f => (
                        <View key={f.head} style={styles.featureItem}>
                            <View style={styles.featureIcon}><Shirt size={s(14)} color={palette.yellow600} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.featureItemHead}>{f.head}</Text>
                                <Text style={styles.featureItemBody}>{f.body}</Text>
                            </View>
                        </View>
                    ))}
                    <Pressable style={styles.featureBtn} onPress={() => go({ categoryName: 'Fashion', subCategoryName: 'Men' })}>
                        <Text style={styles.featureBtnText}>Read the Style Guide →</Text>
                    </Pressable>
                </View>
            </View>

            {/* Tech Drops (the website's "Audio Tech" slot — ZPIN has no audio
                category, so this reads the Watches & smart-wearables catalogue) */}
            <View style={styles.rowBlock}>
                <RowHeader
                    kicker="TECH THAT MOVES WITH YOU"
                    title="Tech Drops"
                    actionLabel="View All"
                    onAction={() => go({ categoryName: 'Accessories', subCategoryName: 'Watches' })}
                />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                {tech.map(item => <MiniCard key={item.id} item={item} width={dropWidth} onPress={() => go(item.nav)} />)}
            </ScrollView>
        </View>
    );
}

/* ── Essentials grid ─────────────────────────────────────────────────────── */

const APPLIANCE_FALLBACK: Item[] = [
    { id: 'ap1', name: 'Electric Kettle', price: 1099, image: 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
    { id: 'ap2', name: 'Table Lamp', price: 799, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
    { id: 'ap3', name: 'Storage Rack', price: 1499, image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
    { id: 'ap4', name: 'Cookware Set', price: 2199, image: 'https://images.unsplash.com/photo-1584990347449-a40b0d7c97c4?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
    { id: 'ap5', name: 'Wall Clock', price: 599, image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
];

const BEAUTY_FALLBACK: Item[] = [
    { id: 'bp1', name: 'Vitamin C Serum', price: 649, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop', nav: { categoryName: 'Beauty' } },
    { id: 'bp2', name: 'Daily Moisturizer', price: 449, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop', nav: { categoryName: 'Beauty' } },
    { id: 'bp3', name: 'Matte Lipstick', price: 349, image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop', nav: { categoryName: 'Beauty' } },
    { id: 'bp4', name: 'Sunscreen SPF 50', price: 499, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&auto=format&fit=crop', nav: { categoryName: 'Beauty' } },
    { id: 'bp5', name: 'Hair Serum', price: 399, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&auto=format&fit=crop', nav: { categoryName: 'Beauty' } },
];

const WATCH_ICONS = [
    { label: 'Smart Watches', Icon: Watch, sub: 'Smart Watches' },
    { label: 'Sports Watches', Icon: Clock, sub: 'Sports Watches' },
    { label: 'Sunglasses', Icon: Glasses, sub: 'Sunglasses & Eyewear' },
    { label: 'Handbags', Icon: Briefcase, sub: 'Bags & Backpacks' },
];

export function EssentialsGrid() {
    const go = useNav();
    const appliances = useCategoryItems('Home Improvement', 5, APPLIANCE_FALLBACK, 3);
    const beauty = useCategoryItems('Skincare', 5, BEAUTY_FALLBACK, 3);
    const cardWidth = s(130);

    // A plain render function, not a component: declaring a component inside the
    // body would remount (and scroll-reset) both rows on every state change.
    const renderRow = ({ kicker, title, sub, items, nav }: { kicker: string; title: string; sub: string; items: Item[]; nav: NavTarget }) => (
        <View style={styles.essentialCard}>
            <RowHeader kicker={kicker} title={title} sub={sub} actionLabel="View All" onAction={() => go(nav)} inset />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.essentialRow}>
                {items.map(item => <MiniCard key={item.id} item={item} width={cardWidth} onPress={() => go(item.nav)} />)}
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.section}>
            <View style={styles.sectionHead}>
                <Text style={styles.kicker}>CURATED FOR YOU</Text>
                <Text style={styles.sectionTitle}>Essentials</Text>
                <View style={styles.underline} />
            </View>

            {renderRow({
                kicker: 'ESSENTIAL TECH',
                title: 'Appliances For You',
                sub: 'Smart home upgrades, up to 55% off',
                items: appliances,
                nav: { categoryName: 'Home & Living', subCategoryName: 'Home Improvement' },
            })}

            <Pressable
                style={[styles.promoTile, { backgroundColor: palette.yellow100 }]}
                onPress={() => go({ categoryName: 'Home & Living' })}
            >
                <View style={styles.promoIcon}><Lamp size={s(22)} color={palette.yellow800} /></View>
                <Text style={styles.promoTitle}>Revamp Your Space</Text>
                <Text style={styles.promoSub}>Furniture, decor & lighting curated for your home</Text>
                <Text style={styles.promoCta}>Explore Ideas →</Text>
            </Pressable>

            {renderRow({
                kicker: 'PERSONAL CARE',
                title: 'Beauty Picks',
                sub: 'Skincare, haircare & makeup, starting ₹249',
                items: beauty,
                nav: { categoryName: 'Beauty' },
            })}

            <View style={styles.essentialCard}>
                <RowHeader
                    kicker="STYLE & TECH"
                    title="Watches & More"
                    sub="Timeless accessories"
                    actionLabel="View All"
                    onAction={() => go({ categoryName: 'Accessories', subCategoryName: 'Watches' })}
                    inset
                />
                <View style={styles.iconRow}>
                    {WATCH_ICONS.map(({ label, Icon, sub }) => (
                        <Pressable key={label} style={styles.iconItem} onPress={() => go({ categoryName: 'Accessories', subCategoryName: sub })}>
                            <View style={styles.iconCircle}><Icon size={s(18)} color={colors.textStrong} /></View>
                            <Text style={styles.iconLabel} numberOfLines={2}>{label}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </View>
    );
}

/* ── Discover ────────────────────────────────────────────────────────────── */

const POPULAR_FALLBACK: Item[] = [
    { id: 'p1', name: 'Everyday Sneakers', price: 1299, image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&auto=format&fit=crop', nav: { categoryName: 'Footwear' } },
    { id: 'p2', name: 'Cotton Shirt', price: 699, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&auto=format&fit=crop', nav: { categoryName: 'Fashion' } },
    { id: 'p3', name: 'Home Planter', price: 499, image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
    { id: 'p4', name: 'Leather Wallet', price: 599, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&auto=format&fit=crop', nav: { categoryName: 'Accessories' } },
    { id: 'p5', name: 'Wall Clock', price: 599, image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&auto=format&fit=crop', nav: { categoryName: 'Home & Living' } },
];


const TRY_BEFORE = [
    { label: 'Clothes', Icon: Shirt, nav: { categoryName: 'Fashion' } as NavTarget },
    { label: 'Watches', Icon: Watch, nav: { categoryName: 'Accessories', subCategoryName: 'Watches' } as NavTarget },
    { label: 'Eyewear', Icon: Glasses, nav: { categoryName: 'Accessories', subCategoryName: 'Sunglasses & Eyewear' } as NavTarget },
    { label: 'Bags', Icon: ShoppingBag, nav: { categoryName: 'Accessories', subCategoryName: 'Bags & Backpacks' } as NavTarget },
    { label: 'Shoes', Icon: Footprints, nav: { categoryName: 'Footwear' } as NavTarget },
    { label: 'Other', Icon: Lamp, nav: { categoryName: 'Home & Living' } as NavTarget },
];

/**
 * `deals` is the home screen's already-fetched flash-deal list — passed in rather
 * than re-fetched so Bargain Deals costs no extra request.
 */
export function DiscoverSection({ deals, areaLabel }: { deals: FlashDeal[]; areaLabel: string }) {
    const go = useNav();
    const [popular, setPopular] = useState<Item[]>(POPULAR_FALLBACK);

    useEffect(() => {
        let cancelled = false;
        productService.getProducts({ limit: 6 })
            .then(res => {
                if (cancelled) return;
                const live = (res.products || []).slice(0, 6);
                if (live.length < 3) return;
                setPopular(live.map((p: any) => ({
                    id: String(p.productId),
                    name: p.productName,
                    price: Number(p.price) || 0,
                    image: typeof p.images?.[0] === 'string' ? p.images[0] : '',
                    nav: { productId: String(p.productId) },
                })));
            })
            .catch(() => { /* keep the fallback set */ });
        return () => { cancelled = true; };
    }, []);

    // Bargain Deals is a live-deal section, not editorial copy: with no active
    // flash deal there is nothing to advertise, so it hides itself entirely
    // (same rule as the promo banner carousel). Never fall back to invented
    // "% OFF" numbers — a discount shown is a discount the customer can buy.
    const bargains = deals.slice(0, 4).map(d => ({
        id: d.id,
        name: d.productName,
        price: d.dealPrice,
        discount: d.discountPercent > 0 ? `${d.discountPercent}% OFF` : 'HOT DEAL',
        image: d.images?.[0] || '',
        nav: { productId: d.productId } as NavTarget,
    }));

    return (
        <View style={styles.section}>
            <View style={styles.rowBlock}>
                <RowHeader
                    kicker={`TRENDING IN ${areaLabel.toUpperCase()}`}
                    title="Popular in Your Area"
                    actionLabel="View All"
                    onAction={() => go({})}
                />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                {popular.map(item => <MiniCard key={item.id} item={item} width={s(140)} onPress={() => go(item.nav)} />)}
            </ScrollView>

            <Pressable style={styles.localCard} onPress={() => go({})}>
                <Text style={styles.localTag}>COMMUNITY CHOICE</Text>
                <Text style={styles.localTitle}>Support Local Shops 💗</Text>
                <Text style={styles.localSub}>Shop from boutiques nearby and get same-day delivery right to your doorstep.</Text>
                <Text style={styles.localCta}>Shop Nearby →</Text>
            </Pressable>

            <View style={styles.essentialCard}>
                <RowHeader title="Try Before Buying" sub="Trial available on these categories" actionLabel="View All" onAction={() => go({})} inset />
                <View style={styles.tbbGrid}>
                    {TRY_BEFORE.map(({ label, Icon, nav }) => (
                        <Pressable key={label} style={styles.tbbItem} onPress={() => go(nav)}>
                            <View style={styles.iconCircle}><Icon size={s(18)} color={colors.textStrong} /></View>
                            <Text style={styles.iconLabel} numberOfLines={2}>{label}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {bargains.length > 0 && <>
            <View style={styles.rowBlock}>
                <RowHeader title="Bargain Deals 🔥" actionLabel="View All" onAction={() => go({})} />
            </View>
            <View style={styles.bargainGrid}>
                {bargains.map(b => (
                    <Pressable key={b.id} style={styles.bargainCard} onPress={() => go(b.nav)}>
                        <View style={styles.bargainImageWrap}>
                            {!!b.image && <Image source={{ uri: b.image }} style={styles.miniImage} contentFit="cover" />}
                            <View style={styles.bargainBadge}><Text style={styles.bargainBadgeText}>{b.discount}</Text></View>
                        </View>
                        <Text style={styles.miniName} numberOfLines={1}>{b.name}</Text>
                        <Text style={styles.miniPrice}>{fmt(b.price)}</Text>
                    </Pressable>
                ))}
            </View>
            </>}
        </View>
    );
}

const styles = createStyles({
    section: { marginTop: 34 },
    sectionHead: { paddingHorizontal: 20, marginBottom: 16 },
    sectionTitle: { fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: -0.6, color: colors.textStrong },
    sectionSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 4 },
    underline: { width: 44, height: 3, borderRadius: 2, backgroundColor: palette.yellow500, marginTop: 8 },
    kicker: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: colors.textFaint, marginBottom: 4 },

    rowBlock: { paddingHorizontal: 20, marginTop: 24 },
    rowHeader: { marginBottom: 12 },
    rowHeaderInset: { paddingHorizontal: 16 },
    rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    rowTitle: { flexShrink: 1, fontFamily: fonts.displayBold, fontSize: 18, letterSpacing: -0.4, color: colors.textStrong },
    rowSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 4 },
    viewAll: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.brandPress },
    hList: { paddingHorizontal: 20, gap: 12 },

    mini: {},
    miniImageWrap: { width: '100%', aspectRatio: 0.9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceSunken, marginBottom: 7 },
    miniImage: { width: '100%', height: '100%' },
    miniName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textStrong },
    miniPrice: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.textStrong, marginTop: 2 },

    heroSpaced: { marginTop: 18 },
    heroCard: { marginHorizontal: 20, minHeight: 210, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceSunken, justifyContent: 'flex-end' },
    heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    heroScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,11,0.42)' },
    heroBody: { padding: 20 },
    heroTag: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
    heroTagText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1, color: colors.textInvert },
    heroTitle: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 27, letterSpacing: -0.6, color: colors.textInvert },
    heroDesc: { fontFamily: fonts.bodyRegular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, marginBottom: 14 },
    heroCta: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: palette.yellow500, borderRadius: 100, paddingVertical: 11, paddingHorizontal: 16 },
    heroCtaText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textOnYellow },

    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', rowGap: 14, marginTop: 14 },
    tile: { width: '47.5%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle },
    tileImage: { width: '100%', height: 96, backgroundColor: colors.surfaceSunken },
    tileBody: { padding: 12 },
    tileTag: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1, color: palette.yellow700, marginBottom: 4 },
    tileTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    tileSub: { fontFamily: fonts.bodyRegular, fontSize: 11, lineHeight: 14, color: colors.textMuted, marginTop: 2 },
    // Two lines held open: on a 320dp phone some of the four subs wrap and some
    // do not, and without the reserve each tile's "Explore" sat at its own height.
    tileSubGrid: { minHeight: 28 },
    tileExplore: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.brandPress, marginTop: 8 },

    wideTile: { marginHorizontal: 20, marginTop: 14, flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle },
    wideTileImage: { width: 110, height: 110, backgroundColor: colors.surfaceSunken },
    wideTileBody: { flex: 1, padding: 13 },

    arrivals: { marginHorizontal: 20, marginTop: 20, minHeight: 190, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceInverse, justifyContent: 'center' },
    arrivalsImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    arrivalsScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,11,0.55)' },
    arrivalsBody: { padding: 20 },
    arrivalsTag: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: palette.yellow400, marginBottom: 6 },
    arrivalsTitle: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26, letterSpacing: -0.6, color: colors.textInvert },
    arrivalsSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 5, marginBottom: 14 },
    arrivalsCta: { alignSelf: 'flex-start', backgroundColor: palette.yellow500, borderRadius: 100, paddingVertical: 10, paddingHorizontal: 18 },
    arrivalsCtaText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textOnYellow },

    editorialRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 24 },
    editorialCard: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle },
    editorialImage: { width: '100%', height: 120, backgroundColor: colors.surfaceSunken },
    editorialBody: { padding: 13 },
    editorialTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.textStrong },
    editorialSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textMuted, marginTop: 3 },

    feature: { marginHorizontal: 20, marginTop: 24, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle },
    featureImage: { width: '100%', height: 170, backgroundColor: colors.surfaceSunken },
    featureBody: { padding: 18 },
    featureTitle: { fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.5, color: colors.textStrong },
    featureDesc: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 5, marginBottom: 14 },
    featureItem: { flexDirection: 'row', gap: 11, marginBottom: 12 },
    featureIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceBrandTint, alignItems: 'center', justifyContent: 'center' },
    featureItemHead: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },
    featureItemBody: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 1 },
    featureBtn: { alignSelf: 'flex-start', backgroundColor: colors.surfaceInverse, borderRadius: 100, paddingVertical: 11, paddingHorizontal: 18, marginTop: 4 },
    featureBtnText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textInvert },

    essentialCard: { marginHorizontal: 20, marginTop: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle, paddingVertical: 16 },
    essentialRow: { paddingHorizontal: 16, gap: 12 },

    promoTile: { marginHorizontal: 20, marginTop: 14, borderRadius: radius.lg, padding: 20 },
    promoIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    promoTitle: { fontFamily: fonts.displayBold, fontSize: 19, letterSpacing: -0.4, color: palette.yellow900 },
    promoSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.yellow800, marginTop: 4 },
    promoCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.yellow900, marginTop: 12 },

    iconRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
    iconItem: { alignItems: 'center', width: '23%' },
    iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    iconLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 13, color: colors.textBody, textAlign: 'center' },

    localCard: { marginHorizontal: 20, marginTop: 20, borderRadius: radius.lg, backgroundColor: colors.surfaceInverse, padding: 20 },
    localTag: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: palette.yellow400, marginBottom: 8 },
    localTitle: { fontFamily: fonts.displayBold, fontSize: 19, letterSpacing: -0.4, color: colors.textInvert },
    localSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.neutral300, marginTop: 5 },
    localCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.yellow400, marginTop: 12 },

    tbbGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, rowGap: 14 },
    tbbItem: { width: '33.3%', alignItems: 'center' },

    bargainGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', rowGap: 16 },
    bargainCard: { width: '47.5%' },
    bargainImageWrap: { width: '100%', aspectRatio: 1.05, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceSunken, marginBottom: 7 },
    bargainBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: palette.danger500, borderRadius: radius.xs, paddingHorizontal: 7, paddingVertical: 3 },
    bargainBadgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: colors.textInvert },
});
