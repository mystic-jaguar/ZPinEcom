import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ProductImageCarouselProps {
    images: any[];
    isLightningFast?: boolean;
    onBack?: () => void;
}

export default function ProductImageCarousel({ images, isLightningFast, onBack }: ProductImageCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
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
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="share-social-outline" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="heart-outline" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                {images.map((img, index) => (
                    <View key={index} style={styles.imageContainer}>
                        <Image source={img} style={styles.image} />
                    </View>
                ))}
            </ScrollView>

            {/* Lightning Fast Tag */}
            {isLightningFast && (
                <View style={styles.lightningTag}>
                    <Text style={styles.lightningText}>LIGHTNING FAST DELIVERY</Text>
                </View>
            )}

            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {images.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            activeIndex === index ? styles.activeDot : styles.inactiveDot
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
        width: width,
        height: 400,
        justifyContent: 'center',
        alignItems: 'center'
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
