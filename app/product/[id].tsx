import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AccordionItem from '../../components/common/AccordionItem';
import ActionModal from '../../components/common/ActionModal';
import DeliveryOptionSelector from '../../components/product/DeliveryOptionSelector';
import ProductImageCarousel from '../../components/product/ProductImageCarousel';
import VariantSelector from '../../components/product/VariantSelector';
import { PRODUCTS } from '../../constants/products';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Find product or fallback to first one for demo
    const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0];

    // State for selectors
    const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '');
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[2] || 'M'); // Default to M
    const [deliveryOption, setDeliveryOption] = useState<'instant' | 'standard'>('instant');

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Images Carousel */}
                <View style={{ position: 'relative' }}>
                    <ProductImageCarousel
                        images={product.images || [product.image]}
                        isLightningFast={product.isLightningFast}
                        onBack={() => router.back()}
                        isWishlisted={isInWishlist(product.id)}
                        onToggleWishlist={() => {
                            if (isInWishlist(product.id)) {
                                removeFromWishlist(product.id);
                            } else {
                                addToWishlist(product);
                            }
                        }}
                    />
                </View>

                {/* Main Info */}
                <View style={styles.mainInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.ratingBadge}>
                            <Text style={styles.ratingText}>{product.rating}</Text>
                            <Ionicons name="star" size={10} color="#fff" />
                        </View>
                    </View>

                    {product.subtitle && (
                        <Text style={styles.subtitle}>{product.subtitle}</Text>
                    )}

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
                        {product.originalPrice && (
                            <>
                                <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString()}</Text>
                                <Text style={styles.discountText}>({product.discount}% OFF)</Text>
                            </>
                        )}
                    </View>

                    {/* Lightning Offer Banner */}
                    <View style={styles.offerBanner}>
                        <View style={styles.offerIcon}>
                            <Feather name="tag" size={16} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.offerTitle}>Lightning Offer</Text>
                            <Text style={styles.offerDesc}>Get extra ₹100 OFF on your first purchase. Use code: <Text style={{ fontWeight: '700' }}>ZIPIN100</Text></Text>
                        </View>
                    </View>

                    {/* Action Buttons (Inline Wishlist + Add to Cart) - Placed below price as per some layouts, or fixed bottom. 
                        Ref image shows them inline? No, ref image fixed bottom usually, but here buttons are mid-page.
                        Actually ref image has them below offer.
                    */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.wishlistBtn}
                            onPress={() => {
                                if (isInWishlist(product.id)) {
                                    removeFromWishlist(product.id);
                                } else {
                                    addToWishlist(product);
                                }
                            }}
                        >
                            <Feather
                                name={isInWishlist(product.id) ? "heart" : "heart"}
                                size={20}
                                color={isInWishlist(product.id) ? "#F59E0B" : "#1a1a1a"}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.wishlistText}>Wishlist</Text>
                        </TouchableOpacity>

                        {/* Wait, the previous block had Text inside. Let's rewrite properly. */}
                        <TouchableOpacity
                            style={styles.addToCartBtn}
                            onPress={() => {
                                addToCart(product, selectedColor, selectedSize);
                                setShowSuccessModal(true);
                            }}
                        >
                            <Feather name="shopping-cart" size={20} color="#1a1a1a" />
                            <Text style={styles.addToCartText}>Add to Cart</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Variants */}
                    <VariantSelector
                        colors={product.colors}
                        sizes={product.sizes}
                        selectedColor={selectedColor}
                        selectedSize={selectedSize}
                        onSelectColor={setSelectedColor}
                        onSelectSize={setSelectedSize}
                    />

                    {/* Delivery Option Toggle */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={styles.sectionLabel}>SELECT DELIVERY TYPE</Text>
                        <DeliveryOptionSelector
                            selectedOption={deliveryOption}
                            onSelect={setDeliveryOption}
                        />

                        <View style={styles.disclaimerBox}>
                            <Text style={styles.disclaimerText}>
                                {deliveryOption === 'instant'
                                    ? "In this delivery type the delivery boy will stay at the location for 15 minutes so that if the customer wishes to buy they can pay the entire amount or if not they can pay the charges for the instant trial only and not the entire amount."
                                    : "This is standard delivery."
                                }
                            </Text>
                        </View>
                    </View>

                    {/* Delivery Info */}
                    <View style={styles.deliveryRow}>
                        <View style={styles.deliveryItem}>
                            <View style={styles.deliveryIcon}>
                                <Feather name="zap" size={14} color="#1a1a1a" />
                            </View>
                            <Text style={styles.deliveryText}>Delivery in 2-12 hrs</Text>
                        </View>
                        <View style={styles.deliveryItem}>
                            <View style={styles.deliveryIcon}>
                                <Feather name="rotate-ccw" size={14} color="#1a1a1a" />
                            </View>
                            <Text style={styles.deliveryText}>
                                {deliveryOption === 'instant' ? (
                                    <Text style={{ fontWeight: '700' }}>Instant Return</Text>
                                ) : (
                                    <>Easy <Text style={{ fontWeight: '700' }}>5 days</Text> return</>
                                )}
                            </Text>
                        </View>
                    </View>

                    {/* Accordions */}
                    <View style={styles.divider} />

                    <AccordionItem title="Product Details" initiallyExpanded>
                        <Text style={styles.bodyText}>
                            {product.details || product.description}
                        </Text>
                    </AccordionItem>

                    <AccordionItem title="Reviews (1,248)">
                        <Text style={styles.bodyText}>User reviews will appear here.</Text>
                    </AccordionItem>

                    <AccordionItem title="Shipping & Returns">
                        <Text style={styles.bodyText}>Standard shipping logic applies.</Text>
                    </AccordionItem>

                </View>

                {/* You might also like Section */}
                <View style={styles.recommendationSection}>
                    <Text style={styles.sectionTitle}>You might also like</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                        {PRODUCTS.slice(1, 5).map((p, i) => (
                            <View key={i} style={styles.recCard}>
                                <View style={styles.recImagePlaceholder}>
                                    {/* Use generic placeholder logic if image requires loop */}
                                    <Text style={{ fontSize: 10, color: '#aaa' }}>Img</Text>
                                </View>
                                <Text style={styles.recTitle} numberOfLines={1}>{p.name}</Text>
                                <Text style={styles.recPrice}>₹{p.price}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

            </ScrollView>

            <ActionModal
                visible={showSuccessModal}
                title="Added to Cart!"
                message={`Successfully added ${product.name} to your cart.`}
                primaryButtonText="Go to Cart"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    router.push('/(tabs)/cart');
                }}
                secondaryButtonText="Continue Shopping"
                onSecondaryPress={() => setShowSuccessModal(false)}
                onClose={() => setShowSuccessModal(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    backButton: {
        position: 'absolute',
        top: 50, // SafeArea adjustment
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 20
    },
    mainInfo: {
        padding: 20
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5
    },
    productName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 10,
        lineHeight: 26
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#059669', // Green
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4
    },
    ratingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        marginRight: 2
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20
    },
    price: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a1a',
        marginRight: 10
    },
    originalPrice: {
        fontSize: 16,
        color: '#999',
        textDecorationLine: 'line-through',
        marginRight: 10
    },
    discountText: {
        fontSize: 16,
        color: '#FBBF24',
        fontWeight: '700'
    },
    offerBanner: {
        backgroundColor: '#FFFBE6',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    offerIcon: {
        marginRight: 10,
        marginTop: 2
    },
    offerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2
    },
    offerDesc: {
        fontSize: 11,
        color: '#555',
        lineHeight: 16,
        maxWidth: '95%'
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 10 // before selectors
    },
    wishlistBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 15
    },
    wishlistText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    addToCartBtn: {
        flex: 1.5,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#FBBF24'
    },
    addToCartText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '800',
        color: '#1a1a1a'
    },
    deliveryRow: {
        flexDirection: 'row',
        marginTop: 20,
        marginBottom: 10
    },
    deliveryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20
    },
    deliveryIcon: {
        marginRight: 6
    },
    deliveryText: {
        fontSize: 11,
        color: '#333'
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 15
    },
    bodyText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22
    },
    recommendationSection: {
        marginTop: 20,
        marginBottom: 30
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 15,
        paddingHorizontal: 20
    },
    recCard: {
        width: 140,
        marginRight: 15
    },
    recImagePlaceholder: {
        width: 140,
        height: 180,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    recTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4
    },
    recPrice: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        marginBottom: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    disclaimerBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    disclaimerText: {
        fontSize: 12,
        color: '#555',
        lineHeight: 18,
        fontStyle: 'italic'
    }
});
