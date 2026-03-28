import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AccordionItem from '../../components/common/AccordionItem';
import ActionModal from '../../components/common/ActionModal';
import DeliveryOptionSelector from '../../components/product/DeliveryOptionSelector';
import ProductImageCarousel from '../../components/product/ProductImageCarousel';
import VariantSelector from '../../components/product/VariantSelector';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { productService } from '../../services/product';
import { ProductObject } from '../../types/types';

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showVariantWarningModal, setShowVariantWarningModal] = useState(false);

    // Product State
    const [product, setProduct] = useState<ProductObject | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<ProductObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for selectors
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [deliveryOption, setDeliveryOption] = useState<'instant' | 'standard'>('instant');

    useEffect(() => {
        if (id) {
            loadProduct(id as string);
        }
    }, [id]);

    const loadProduct = async (productId: string) => {
        try {
            setLoading(true);
            setError(null);
            const [data, related] = await Promise.all([
                productService.getProductById(productId),
                productService.getProducts({ limit: 6 }).then(r => r.products.filter(p => p.productId !== productId).slice(0, 4)).catch(() => []),
            ]);
            setProduct(data);
            setRelatedProducts(related);
            if (data.colors && data.colors.length > 0) setSelectedColor(data.colors[0]);
            if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[2] || data.sizes[0]);
        } catch (err: any) {
            setError(err.message || 'Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = () => {
        if (!product) return;

        // Validate variant selection if product has variants
        const requiresColor = product.colors && product.colors.length > 0;
        const requiresSize = product.sizes && product.sizes.length > 0;

        if ((requiresColor && !selectedColor) || (requiresSize && !selectedSize)) {
            setShowVariantWarningModal(true);
            return;
        }

        addToCart(product, selectedColor, selectedSize);
        setShowSuccessModal(true);
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#FBBF24" />
            </View>
        );
    }

    if (error || !product) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Feather name="alert-triangle" size={48} color="#FF3B30" />
                <Text style={{ marginTop: 20, fontSize: 16, color: '#666', textAlign: 'center' }}>
                    {error || 'Product not found'}
                </Text>
                <TouchableOpacity
                    style={{ marginTop: 20, padding: 10, backgroundColor: '#FBBF24', borderRadius: 8 }}
                    onPress={() => router.back()}
                >
                    <Text style={{ fontWeight: 'bold' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Images Carousel */}
                <View style={{ position: 'relative' }}>
                    <ProductImageCarousel
                        images={product.images || []}
                        isLightningFast={product.isLightningFast}
                        onBack={() => router.back()}
                        isWishlisted={isInWishlist(product.productId)}
                        onToggleWishlist={() => {
                            if (isInWishlist(product.productId)) {
                                removeFromWishlist(product.productId);
                            } else {
                                addToWishlist(product);
                            }
                        }}
                    />
                </View>

                {/* Main Info */}
                <View style={styles.mainInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.productName}>{product.productName}</Text>
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

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.wishlistBtn}
                            onPress={() => {
                                if (isInWishlist(product.productId)) {
                                    removeFromWishlist(product.productId);
                                } else {
                                    addToWishlist(product);
                                }
                            }}
                        >
                            <Feather
                                name={isInWishlist(product.productId) ? "heart" : "heart"}
                                size={20}
                                color={isInWishlist(product.productId) ? "#F59E0B" : "#1a1a1a"}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.wishlistText}>Wishlist</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addToCartBtn}
                            onPress={handleAddToCart}
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
                {relatedProducts.length > 0 && (
                <View style={styles.recommendationSection}>
                    <Text style={styles.sectionTitle}>You might also like</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                        {relatedProducts.map((p) => (
                            <TouchableOpacity
                                key={p.productId}
                                style={styles.recCard}
                                onPress={() => router.push(`/product/${p.productId}`)}
                            >
                                <View style={styles.recImagePlaceholder}>
                                    {p.images?.[0] ? (
                                        <Image
                                            source={{ uri: p.images[0] as string }}
                                            style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <Feather name="image" size={24} color="#ccc" />
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.recTitle} numberOfLines={1}>{p.productName}</Text>
                                <Text style={styles.recPrice}>₹{p.price}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                )}

            </ScrollView>


            <ActionModal
                visible={showSuccessModal}
                title="Added to Cart!"
                message={`Successfully added ${product.productName} to your cart.`}
                primaryButtonText="Go to Cart"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    router.push('/(tabs)/cart');
                }}
                secondaryButtonText="Continue Shopping"
                onSecondaryPress={() => setShowSuccessModal(false)}
                onClose={() => setShowSuccessModal(false)}
            />

            {/* Variant Warning Modal */}
            <ActionModal
                visible={showVariantWarningModal}
                title="Selection Required"
                message="Please select color and size before adding to cart."
                icon="alert-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setShowVariantWarningModal(false)}
                onClose={() => setShowVariantWarningModal(false)}
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
