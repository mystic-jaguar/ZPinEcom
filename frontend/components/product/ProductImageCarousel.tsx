import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import ImageZoomModal from './ImageZoomModal';
import { Text } from '../ui/ScaledText';
import { createStyles } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface ProductImageCarouselProps {
    images: any[];
    isLightningFast?: boolean;
    onBack?: () => void;
    isWishlisted?: boolean;
    onToggleWishlist?: () => void;
    productId?: string;
    productName?: string;
}

export default function ProductImageCarousel({ images, isLightningFast, onBack, isWishlisted, onToggleWishlist, productId, productName }: ProductImageCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    // Tap an image to open it full-screen, where pinch-to-zoom lives. Swipe
    // already works here and a pinch would fight the pager for the same touch.
    const [zoomIndex, setZoomIndex] = useState<number | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    // Ensure we always have at least one image to render
    const safeImages = images && images.length > 0 ? images : [null];

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        if (slideSize === 0) return;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        setActiveIndex(roundIndex);
    };

    return (
        <View style={styles.container}>
            {/* Header Actions Overlay */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity style={styles.iconButton} onPress={onBack}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.rightActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                            if (!productId) return;
                            const url = `https://www.zpinservices.com/product/${productId}`;
                            Share.share({ message: `Check out ${productName || 'this product'} on ZPIN — ${url}`, url });
                        }}
                    >
                        <Ionicons name="share-social-outline" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onToggleWishlist}
                    >
                        <Ionicons
                            name={isWishlisted ? "heart" : "heart-outline"}
                            size={24}
                            color={isWishlisted ? "#FF3B30" : "#333"}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                {safeImages.map((img, index) => (
                    <View key={index} style={[styles.imageContainer, { width }]}>
                        {img ? (
                            <TouchableOpacity activeOpacity={0.9} style={styles.imageTouch} onPress={() => setZoomIndex(index)}>
                                <Image
                                    source={typeof img === 'string' ? { uri: img } : img}
                                    style={styles.image}
                                />
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.image, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]} />
                        )}
                    </View>
                ))}
            </ScrollView>

            {/* Lightning Fast Tag */}
            {isLightningFast && (
                <View style={styles.lightningTag}>
                    <Text style={styles.lightningText}>LIGHTNING FAST DELIVERY</Text>
                </View>
            )}

            <ImageZoomModal
                visible={zoomIndex !== null}
                images={safeImages}
                initialIndex={zoomIndex ?? 0}
                onIndexChange={(i) => {
                    setActiveIndex(i);
                    scrollRef.current?.scrollTo({ x: i * width, animated: false });
                }}
                onClose={() => setZoomIndex(null)}
            />

            {/* Pagination Dots — only show if more than 1 image */}
            {safeImages.length > 1 && (
            <View style={styles.pagination}>
                {safeImages.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            activeIndex === index ? styles.activeDot : styles.inactiveDot
                        ]}
                    />
                ))}
            </View>
            )}
        </View>
    );
}

const styles = createStyles({
    container: {
        height: 400,
        width: '100%',
        backgroundColor: '#f9f9f9',
        position: 'relative'
    },
    headerOverlay: {
        position: 'absolute',
        top: 40, // Adjusted for typical status bar height. 
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        zIndex: 10
    },
    rightActions: {
        flexDirection: 'row'
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },
    scrollView: {
        flex: 1
    },
    imageContainer: {
        // width is applied inline from the real window width: it must match the
        // scroll offset exactly for paging to land on the right image, so it must
        // not go through createStyles' device scaling.
        height: 400,
        justifyContent: 'center',
        alignItems: 'center'
    },
    imageTouch: {
        width: '100%',
        height: '100%'
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    lightningTag: {
        position: 'absolute',
        top: 60,
        left: 0,
        backgroundColor: '#FBBF24',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 5
    },
    lightningText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: 0.5
    },
    pagination: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        alignSelf: 'center'
    },
    dot: {
        height: 4,
        borderRadius: 2,
        marginHorizontal: 3
    },
    activeDot: {
        width: 20,
        backgroundColor: '#FBBF24'
    },
    inactiveDot: {
        width: 10,
        backgroundColor: 'rgba(0,0,0,0.2)'
    }
});
