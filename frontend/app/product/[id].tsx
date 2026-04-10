import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AccordionItem from '../../components/common/AccordionItem';
import ActionModal from '../../components/common/ActionModal';
import DeliveryOptionSelector from '../../components/product/DeliveryOptionSelector';
import ProductImageCarousel from '../../components/product/ProductImageCarousel';
import VariantSelector from '../../components/product/VariantSelector';
import { useCart } from '../../context/CartContext';
import { useOrder } from '../../context/OrderContext';
import { useUser } from '../../context/UserContext';
import { useWishlist } from '../../context/WishlistContext';
import apiClient from '../../services/api';
import { productService } from '../../services/product';
import { reviewService } from '../../services/review';
import { ProductObject, ReviewObject } from '../../types/types';

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const productId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { user, isAuthenticated } = useUser();
    const { orders, isLoading: isOrdersLoading } = useOrder();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showVariantWarningModal, setShowVariantWarningModal] = useState(false);
    const [showDeleteReviewModal, setShowDeleteReviewModal] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState<ReviewObject | null>(null);

    // Product State
    const [product, setProduct] = useState<ProductObject | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<ProductObject[]>([]);
    const [reviews, setReviews] = useState<ReviewObject[]>([]);
    const [myReview, setMyReview] = useState<ReviewObject | null>(null);
    const [reviewTotal, setReviewTotal] = useState(0);
    const [activeCoupon, setActiveCoupon] = useState<{ code: string; description: string; discountType: string; discountValue: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for selectors
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [deliveryOption, setDeliveryOption] = useState<'instant' | 'standard'>('instant');

    const ownReview = myReview || reviews.find(review => review.userId === user.id);
    const hasDeliveredPurchase = Boolean(
        isAuthenticated && product && orders.some(order =>
            order.status === 'delivered' && order.items.some(item => item.productId === product.productId)
        )
    );
    const canWriteReview = hasDeliveredPurchase;
    const showReviewForm = canWriteReview || Boolean(ownReview);

    const loadReviews = async (currentProductId: string) => {
        try {
            const [reviewsRes, mineRes] = await Promise.all([
                reviewService.getProductReviews(currentProductId, 1, 10),
                isAuthenticated ? reviewService.getProductReviews(currentProductId, 1, 1, true).catch(() => null) : Promise.resolve(null),
            ]);
            setReviews(reviewsRes.data || []);
            setReviewTotal(reviewsRes.pagination?.totalItems || 0);
            setMyReview(mineRes?.data?.[0] || null);
        } catch {
            setReviews([]);
            setMyReview(null);
            setReviewTotal(0);
        }
    };

    useEffect(() => {
        if (productId) {
            loadProduct(productId);
        }
    }, [productId]);

    useEffect(() => {
        if (ownReview) {
            setReviewRating(ownReview.rating);
            setReviewComment(ownReview.comment);
        } else {
            setReviewRating(5);
            setReviewComment('');
        }
    }, [ownReview?.id]);

    const loadProduct = async (productId: string) => {
        try {
            setLoading(true);
            setError(null);
            const [data, related, couponsRes] = await Promise.all([
                productService.getProductById(productId),
                productService.getProducts({ limit: 6 }).then(r => r.products.filter(p => p.productId !== productId).slice(0, 4)).catch(() => []),
                apiClient.get('coupons').catch(() => ({ data: { data: [] } })),
            ]);
            setProduct(data);
            setRelatedProducts(related);
            await loadReviews(productId);
            // Pick the first active coupon to display
            const activeCoupons = (couponsRes.data?.data || []).filter((c: any) => c.status === 'active');
            if (activeCoupons.length > 0) setActiveCoupon(activeCoupons[0]);
            if (data.colors && data.colors.length > 0) setSelectedColor(data.colors[0]);
            if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[2] || data.sizes[0]);
        } catch (err: any) {
            setError(err.message || 'Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!product) return;
        if (!canWriteReview && !ownReview) return;

        const trimmedComment = reviewComment.trim();
        if (!trimmedComment) {
            setReviewFeedback('Please write a review comment.');
            return;
        }

        try {
            setReviewSubmitting(true);
            setReviewFeedback(null);

            if (ownReview) {
                await reviewService.updateProductReview(product.productId, ownReview.id, {
                    rating: reviewRating,
                    comment: trimmedComment,
                });
                setReviewFeedback('Your review was updated.');
            } else {
                await reviewService.addProductReview(product.productId, {
                    rating: reviewRating,
                    comment: trimmedComment,
                });
                setReviewFeedback('Thanks for reviewing this product.');
            }

            await loadReviews(product.productId);
        } catch (err: any) {
            setReviewFeedback(err.message || 'Failed to submit review.');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!product || !reviewToDelete) return;

        try {
            setReviewSubmitting(true);
            setReviewFeedback(null);
            await reviewService.deleteProductReview(product.productId, reviewToDelete.id);
            setReviewToDelete(null);
            setShowDeleteReviewModal(false);
            setReviewComment('');
            setReviewRating(5);
            setReviewFeedback('Your review was deleted.');
            await loadReviews(product.productId);
        } catch (err: any) {
            setReviewFeedback(err.message || 'Failed to delete review.');
        } finally {
            setReviewSubmitting(false);
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
                        {(product.rating ?? 0) > 0 && (
                            <View style={[styles.ratingBadge, { backgroundColor: (product.rating ?? 0) >= 4 ? '#059669' : (product.rating ?? 0) >= 3 ? '#D97706' : '#EF4444' }]}>
                                <Text style={styles.ratingText}>{(product.rating ?? 0).toFixed(1)}</Text>
                                <Ionicons name="star" size={10} color="#fff" />
                            </View>
                        )}
                    </View>

                    {/* Rating summary row */}
                    {reviewTotal > 0 && (
                        <View style={styles.ratingSummaryRow}>
                            {[5,4,3,2,1].map(star => {
                                const count = reviews.filter(r => r.rating === star).length;
                                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                return (
                                    <View key={star} style={styles.ratingBarRow}>
                                        <Text style={styles.ratingBarLabel}>{star}</Text>
                                        <Ionicons name="star" size={10} color="#FBBF24" />
                                        <View style={styles.ratingBarTrack}>
                                            <View style={[styles.ratingBarFill, { width: `${pct}%` }]} />
                                        </View>
                                        <Text style={styles.ratingBarCount}>{count}</Text>
                                    </View>
                                );
                            })}
                            <Text style={styles.ratingTotalText}>{reviewTotal} rating{reviewTotal !== 1 ? 's' : ''}</Text>
                        </View>
                    )}

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

                    {/* Coupon Banner — from database */}
                    {activeCoupon && (
                        <View style={styles.offerBanner}>
                            <View style={styles.offerIcon}>
                                <Feather name="tag" size={16} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.offerTitle}>
                                    {activeCoupon.discountType === 'percentage'
                                        ? `${activeCoupon.discountValue}% OFF`
                                        : `₹${activeCoupon.discountValue} OFF`}
                                </Text>
                                <Text style={styles.offerDesc}>
                                    {activeCoupon.description} Use code:{' '}
                                    <Text style={{ fontWeight: '700' }}>{activeCoupon.code}</Text>
                                </Text>
                            </View>
                        </View>
                    )}

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
                        sizeQuantities={(product as any).sizeQuantities}
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

                    <AccordionItem title={`Reviews${reviewTotal > 0 ? ` (${reviewTotal})` : ''}`}>
                        {showReviewForm ? (
                            <View style={styles.reviewComposer}>
                                <View style={styles.reviewComposerHeader}>
                                    <Text style={styles.reviewComposerTitle}>{ownReview ? 'Edit your review' : 'Write a review'}</Text>
                                    <Text style={styles.reviewComposerSubtitle}>
                                        {ownReview
                                            ? 'You can update or delete your review at any time.'
                                            : 'This product has been delivered to your account, so you can leave a review now.'}
                                    </Text>
                                </View>

                                <View style={styles.reviewStarsRow}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() => setReviewRating(star)}
                                            style={styles.reviewStarButton}
                                        >
                                            <Ionicons
                                                name="star"
                                                size={22}
                                                color={star <= reviewRating ? '#FBBF24' : '#D1D5DB'}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    value={reviewComment}
                                    onChangeText={setReviewComment}
                                    placeholder="Share what you liked, quality, fit, or delivery experience..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={4}
                                    style={styles.reviewInput}
                                />

                                {reviewFeedback ? <Text style={styles.reviewFeedback}>{reviewFeedback}</Text> : null}

                                <View style={styles.reviewActionRow}>
                                    <TouchableOpacity
                                        style={[styles.reviewSubmitButton, reviewSubmitting && styles.reviewButtonDisabled]}
                                        onPress={handleReviewSubmit}
                                        disabled={reviewSubmitting}
                                    >
                                        <Text style={styles.reviewSubmitButtonText}>
                                            {reviewSubmitting ? 'Saving...' : ownReview ? 'Update Review' : 'Submit Review'}
                                        </Text>
                                    </TouchableOpacity>

                                    {ownReview && (
                                        <TouchableOpacity
                                            style={[styles.reviewDeleteButton, reviewSubmitting && styles.reviewButtonDisabled]}
                                            onPress={() => {
                                                setReviewToDelete(ownReview);
                                                setShowDeleteReviewModal(true);
                                            }}
                                            disabled={reviewSubmitting}
                                        >
                                            <Text style={styles.reviewDeleteButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.reviewLockedCard}>
                                <Text style={styles.bodyText}>You can write a review after this product has been delivered.</Text>
                                {isOrdersLoading && <Text style={styles.reviewLockedHint}>Checking your delivered orders...</Text>}
                            </View>
                        )}

                        <View style={styles.reviewList}>
                            {reviews.length === 0 ? (
                                <Text style={styles.bodyText}>No reviews yet. Be the first to review!</Text>
                            ) : (
                                reviews.map(r => (
                                    <View key={r.id} style={[styles.reviewItem, r.userId === user.id && styles.ownReviewItem]}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.reviewRatingBadge}>
                                                <Text style={styles.reviewRatingText}>{r.rating}</Text>
                                                <Ionicons name="star" size={9} color="#fff" />
                                            </View>
                                            <Text style={styles.reviewerName}>{r.user?.name || 'User'}</Text>
                                            {r.isVerifiedPurchase && <Text style={styles.reviewVerifiedText}>Verified purchase</Text>}
                                            <Text style={styles.reviewDate}>
                                                {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <Text style={styles.reviewComment}>{r.comment}</Text>
                                    </View>
                                ))
                            )}
                        </View>
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

            <ActionModal
                visible={showDeleteReviewModal}
                title="Delete review?"
                message={reviewToDelete ? `Delete your review for ${product.productName}? This cannot be undone.` : 'Delete this review?'}
                icon="trash-2"
                primaryButtonText={reviewSubmitting ? 'Deleting...' : 'Delete'}
                onPrimaryPress={handleDeleteReview}
                secondaryButtonText="Cancel"
                onSecondaryPress={() => {
                    setShowDeleteReviewModal(false);
                    setReviewToDelete(null);
                }}
                onClose={() => {
                    setShowDeleteReviewModal(false);
                    setReviewToDelete(null);
                }}
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
    },
    // Rating summary
    ratingSummaryRow: {
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
    },
    ratingBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingBarLabel: {
        fontSize: 11,
        color: '#555',
        width: 12,
        marginRight: 3,
    },
    ratingBarTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginHorizontal: 6,
        overflow: 'hidden',
    },
    ratingBarFill: {
        height: '100%',
        backgroundColor: '#FBBF24',
        borderRadius: 3,
    },
    ratingBarCount: {
        fontSize: 11,
        color: '#888',
        width: 16,
        textAlign: 'right',
    },
    ratingTotalText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 6,
        textAlign: 'right',
    },
    reviewList: {
        marginTop: 14,
    },
    reviewComposer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    reviewComposerHeader: {
        marginBottom: 12,
    },
    reviewComposerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    reviewComposerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 18,
    },
    reviewStarsRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    reviewStarButton: {
        marginRight: 6,
    },
    reviewInput: {
        minHeight: 108,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#1a1a1a',
        fontSize: 14,
        textAlignVertical: 'top',
        marginBottom: 10,
    },
    reviewFeedback: {
        fontSize: 12,
        color: '#B45309',
        marginBottom: 10,
    },
    reviewActionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    reviewSubmitButton: {
        flex: 1,
        backgroundColor: '#FBBF24',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    reviewSubmitButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    reviewDeleteButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewDeleteButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#B91C1C',
    },
    reviewButtonDisabled: {
        opacity: 0.7,
    },
    reviewLockedCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    reviewLockedHint: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 6,
    },
    // Reviews
    reviewItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 4,
    },
    ownReviewItem: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 0,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    reviewRatingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#059669',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    reviewRatingText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    reviewerName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
    },
    reviewDate: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    reviewComment: {
        fontSize: 13,
        color: '#555',
        lineHeight: 20,
    },
    reviewVerifiedText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '700',
    },
});
