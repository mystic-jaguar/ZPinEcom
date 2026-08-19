import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RotateCcw, Shirt, ShoppingCart, Zap } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccordionItem from '../../components/common/AccordionItem';
import ActionModal from '../../components/common/ActionModal';
import DeliveryOptionSelector from '../../components/product/DeliveryOptionSelector';
import ProductImageCarousel from '../../components/product/ProductImageCarousel';
import VariantSelector from '../../components/product/VariantSelector';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { useOrder } from '../../context/OrderContext';
import { useUser } from '../../context/UserContext';
import { useWishlist } from '../../context/WishlistContext';
import apiClient, { tokenManager } from '../../services/api';
import { productService } from '../../services/product';
import * as ImagePicker from 'expo-image-picker';
import { MAX_REVIEW_IMAGES, reviewService } from '../../services/review';
import { userService } from '../../services/user';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { ProductObject, ReviewObject } from '../../types/types';
import { productOneLiner } from '../../utils/productDetail';

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const productId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { addToCart, remainingStock } = useCart();
    const { setDeliveryType } = useCheckout();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { user, isAuthenticated } = useUser();
    const { orders, isLoading: isOrdersLoading } = useOrder();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showVariantWarningModal, setShowVariantWarningModal] = useState(false);
    const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
    const [showDeleteReviewModal, setShowDeleteReviewModal] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState<ReviewObject | null>(null);
    // UGC moderation (App Store 1.2): report a review / block its author
    const [reviewToReport, setReviewToReport] = useState<ReviewObject | null>(null);
    const [reviewToBlock, setReviewToBlock] = useState<ReviewObject | null>(null);
    const [moderationBusy, setModerationBusy] = useState(false);

    // Product State
    const [product, setProduct] = useState<ProductObject | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<ProductObject[]>([]);
    const [reviews, setReviews] = useState<ReviewObject[]>([]);
    const [myReview, setMyReview] = useState<ReviewObject | null>(null);
    const [reviewTotal, setReviewTotal] = useState(0);
    // Star distribution over ALL visible reviews (the list itself is only page 1).
    const [ratingCounts, setRatingCounts] = useState<Record<string, number>>({});
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [reviewImageUploading, setReviewImageUploading] = useState(false);
    const [activeCoupon, setActiveCoupon] = useState<{ code: string; description: string; discountType: string; discountValue: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
            const accessToken = await tokenManager.getAccessToken();
            const [reviewsRes, mineRes] = await Promise.all([
                reviewService.getProductReviews(currentProductId, 1, 10),
                accessToken && accessToken !== 'null' && accessToken !== 'undefined'
                    ? reviewService.getProductReviews(currentProductId, 1, 1, true).catch(() => null)
                    : Promise.resolve(null),
            ]);
            setReviews(reviewsRes.data || []);
            setReviewTotal(reviewsRes.pagination?.totalItems || 0);
            setRatingCounts(reviewsRes.ratingCounts || {});
            setMyReview(mineRes?.data?.[0] || null);
        } catch {
            setReviews([]);
            setMyReview(null);
            setReviewTotal(0);
            setRatingCounts({});
        }
    };

    useEffect(() => {
        if (productId) {
            loadProduct(productId);
        }
    }, [productId]);

    // The seller can change the price or the stock at any moment from the vendor
    // app/website, and this screen survives in the navigation stack — so re-pull
    // (silently, no spinner) every time it comes back into view rather than
    // showing whatever the price was when it was first opened.
    const firstFocusRef = React.useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (firstFocusRef.current) { firstFocusRef.current = false; return; }
            if (productId) loadProduct(productId, true);
        }, [productId])
    );

    useEffect(() => {
        if (ownReview) {
            setReviewRating(ownReview.rating);
            setReviewComment(ownReview.comment);
            setReviewImages(ownReview.images || []);
        } else {
            setReviewRating(5);
            setReviewComment('');
            setReviewImages([]);
        }
    }, [ownReview?.id]);

    const loadProduct = async (productId: string, silent = false) => {
        try {
            if (!silent) setLoading(true);
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
            if (data.sizes && data.sizes.length > 0) {
                // Default to the first in-stock size; leave unselected if all are out of stock.
                const sq = (data as any).sizeQuantities || {};
                const firstAvailable = data.sizes.find((s: string) => (sq[s] ?? 1) > 0);
                setSelectedSize(firstAvailable || '');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load product details');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (!productId) return;
        setRefreshing(true);
        await loadProduct(productId as string, true);
        setRefreshing(false);
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
                    images: reviewImages,
                });
                setReviewFeedback('Your review was updated.');
            } else {
                await reviewService.addProductReview(product.productId, {
                    rating: reviewRating,
                    comment: trimmedComment,
                    images: reviewImages,
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

    // Pick one photo and host it straight away, so the review POST only ever
    // carries URLs. Matches the vendor app's ImageUploadTile flow.
    const handlePickReviewImage = async () => {
        if (reviewImages.length >= MAX_REVIEW_IMAGES) return;

        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            setReviewFeedback('Allow photo access to add pictures to your review.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (result.canceled) return;

        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
            setReviewFeedback('Pick an image under 5MB.');
            return;
        }

        try {
            setReviewImageUploading(true);
            setReviewFeedback(null);
            const url = await reviewService.uploadReviewImage(asset.uri);
            setReviewImages(prev => [...prev, url]);
        } catch (err: any) {
            setReviewFeedback(err.message || 'Failed to upload image.');
        } finally {
            setReviewImageUploading(false);
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
            setReviewImages([]);
            setReviewFeedback('Your review was deleted.');
            await loadReviews(product.productId);
        } catch (err: any) {
            setReviewFeedback(err.message || 'Failed to delete review.');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleReportReview = async () => {
        if (!product || !reviewToReport) return;
        try {
            setModerationBusy(true);
            const res = await reviewService.reportProductReview(product.productId, reviewToReport.id);
            setReviewToReport(null);
            setReviewFeedback(res?.data?.hidden
                ? 'Thanks for reporting. This review has been removed pending review.'
                : 'Thanks for reporting. Our team reviews reports within 24 hours.');
            await loadReviews(product.productId);
        } catch (err: any) {
            setReviewToReport(null);
            setReviewFeedback(err.message || 'Failed to report review.');
        } finally {
            setModerationBusy(false);
        }
    };

    const handleBlockUser = async () => {
        if (!product || !reviewToBlock?.userId) return;
        try {
            setModerationBusy(true);
            await userService.blockUser(reviewToBlock.userId);
            setReviewToBlock(null);
            setReviewFeedback("User blocked. You won't see their reviews anymore.");
            await loadReviews(product.productId);
        } catch (err: any) {
            setReviewToBlock(null);
            setReviewFeedback(err.message || 'Failed to block user.');
        } finally {
            setModerationBusy(false);
        }
    };

    const handleAddToCart = async (tryAtDoor = false) => {
        if (!product) return;

        // users.is_live — same rule and same wording as the website's ProductDetail.
        if (product.sellerIsLive === false) {
            setUnavailableMessage('This seller is not live yet. Their products are currently unavailable.');
            return;
        }

        // Validate variant selection if product has variants
        const requiresColor = product.colors && product.colors.length > 0;
        const requiresSize = product.sizes && product.sizes.length > 0;

        if ((requiresColor && !selectedColor) || (requiresSize && !selectedSize)) {
            setShowVariantWarningModal(true);
            return;
        }

        // Block adding a combination that is not in stock.
        const sizeQuantities = (product as any).sizeQuantities as Record<string, number> | undefined;
        if (requiresSize && sizeQuantities && sizeQuantities[selectedSize] === 0) {
            setUnavailableMessage(
                `This product is currently not available in size "${selectedSize}"${selectedColor ? ` (${selectedColor})` : ''}. Please choose another size.`
            );
            return;
        }
        if (!product.inStock) {
            setUnavailableMessage('This product is currently out of stock.');
            return;
        }

        // What's already in the cart counts against the seller's stock, so adding
        // the 6th unit of a 5-in-stock product is refused here with the number.
        if (remainingStock(product, selectedSize) < 1) {
            const held = requiresSize && sizeQuantities && selectedSize
                ? Number(sizeQuantities[selectedSize] || 0)
                : Number(product.quantity ?? 0);
            setUnavailableMessage(held <= 0
                ? 'This product is currently out of stock.'
                : `Only ${held} left in stock — that many are already in your cart.`);
            return;
        }

        try {
            await addToCart(product, selectedColor, selectedSize);
        } catch (err: any) {
            setUnavailableMessage(err?.message || 'Could not add this item to your cart.');
            return;
        }

        if (tryAtDoor) {
            setDeliveryType('Instant');
            router.push('/(tabs)/cart');
            return;
        }
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

    // Single-line detail shown right under the title: the explicit subtitle if the
    // API sends one, else the first sentence of the description.
    const oneLiner = productOneLiner(product);

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}>
                {/* Images Carousel */}
                <View style={{ position: 'relative' }}>
                    <ProductImageCarousel
                        images={product.images || []}
                        isLightningFast={product.isLightningFast}
                        onBack={() => router.back()}
                        productId={product.productId}
                        productName={product.productName}
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

                    {/* One-line product detail, directly under the title */}
                    {oneLiner && <Text style={styles.subtitle} numberOfLines={1}>{oneLiner}</Text>}

                    {/* Seller name inline; the address stays behind the accordion below */}
                    {product.sellerName && (
                        <Text style={styles.sellerLine}>Sold by {product.sellerName}</Text>
                    )}

                    {product.sellerIsLive === false && (
                        <Text style={styles.sellerOfflineLine}>
                            This seller is not live yet — their products are currently unavailable for purchase.
                        </Text>
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

                    {/* Try at door explainer */}
                    <View style={styles.tryCard}>
                        <Zap size={90} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.tryGlow} />
                        <View style={styles.tryIcon}><Shirt size={24} color={colors.textOnYellow} /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tryTitle}>Try it at your door</Text>
                            <Text style={styles.tryDesc}>Courier waits <Text style={styles.tryHl}>15 min</Text>. Keep what fits, hand back the rest — no box, no label.</Text>
                        </View>
                    </View>

                    {/* Delivery promises */}
                    <View style={styles.promiseRow}>
                        <View style={styles.promiseCard}>
                            <Zap size={18} color={palette.yellow600} />
                            <Text style={styles.promiseTitle}>Within 12 hrs</Text>
                            <Text style={styles.promiseSub}>Estimated delivery</Text>
                        </View>
                        <View style={styles.promiseCard}>
                            <RotateCcw size={18} color={palette.yellow600} />
                            <Text style={styles.promiseTitle}>Instant return</Text>
                            <Text style={styles.promiseSub}>Hand it back</Text>
                        </View>
                    </View>

                    {/* Colors / Designs — sibling listings sharing a variant group */}
                    {product.variants && product.variants.length > 0 && (
                        <View style={{ marginTop: 20 }}>
                            <Text style={styles.sectionLabel}>COLOR / DESIGN</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {product.variants.map((v) => (
                                    <TouchableOpacity
                                        key={v.id}
                                        style={styles.variantSwatch}
                                        disabled={v.id === product.productId}
                                        onPress={() => router.push(`/product/${v.id}`)}
                                    >
                                        <View style={[styles.variantSwatchImage, v.id === product.productId && { borderColor: palette.yellow600 }]}>
                                            {v.thumbnail ? (
                                                <Image source={{ uri: v.thumbnail }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
                                            ) : (
                                                <Feather name="image" size={18} color="#ccc" />
                                            )}
                                        </View>
                                        <Text style={styles.variantSwatchLabel} numberOfLines={1}>{v.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

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
                            <Text style={styles.deliveryText}>Est. delivery within 12 hrs</Text>
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

                    {(product.sellerName || product.sellerAddress) && (
                        <AccordionItem title="More information">
                            {product.sellerName && (
                                <Text style={styles.bodyText}>Seller: {product.sellerName}</Text>
                            )}
                            <Text style={styles.bodyText}>
                                Address: {product.sellerAddress || 'Not provided'}
                            </Text>
                        </AccordionItem>
                    )}

                    <AccordionItem title={`Reviews${reviewTotal > 0 ? ` (${reviewTotal})` : ''}`}>
                        {/* Star distribution — counts come from the API so they cover
                            every review, not just the first page loaded below. */}
                        {reviewTotal > 0 && (
                            <View style={styles.ratingSummaryRow}>
                                {[5, 4, 3, 2, 1].map(star => {
                                    const count = ratingCounts[String(star)] ?? 0;
                                    const pct = reviewTotal > 0 ? (count / reviewTotal) * 100 : 0;
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

                                {/* Photos — uploaded on pick, so `reviewImages` is URLs */}
                                <View style={styles.reviewPhotoRow}>
                                    {reviewImages.map((uri, i) => (
                                        <View key={uri} style={styles.reviewPhotoWrap}>
                                            <Image source={{ uri }} style={styles.reviewPhoto} />
                                            <TouchableOpacity
                                                style={styles.reviewPhotoRemove}
                                                accessibilityLabel={`Remove photo ${i + 1}`}
                                                onPress={() => setReviewImages(prev => prev.filter(u => u !== uri))}
                                            >
                                                <Ionicons name="close" size={12} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {reviewImages.length < MAX_REVIEW_IMAGES && (
                                        <TouchableOpacity
                                            style={styles.reviewPhotoAdd}
                                            onPress={handlePickReviewImage}
                                            disabled={reviewImageUploading}
                                            accessibilityRole="button"
                                            accessibilityLabel="Add a photo to your review"
                                        >
                                            {reviewImageUploading
                                                ? <ActivityIndicator size="small" color={palette.yellow600} />
                                                : <><Feather name="camera" size={16} color={palette.yellow600} />
                                                    <Text style={styles.reviewPhotoAddText}>Add photo</Text></>}
                                        </TouchableOpacity>
                                    )}
                                </View>

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

                                <Text style={styles.reviewEula}>
                                    By posting, you agree to our zero-tolerance policy on objectionable,
                                    abusive, or offensive content. Violating reviews are removed and repeat
                                    offenders may have their account suspended.
                                </Text>
                            </View>
                        ) : null}

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
                                        {!!r.images?.length && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotoStrip}>
                                                {r.images.map(uri => (
                                                    <Image key={uri} source={{ uri }} style={styles.reviewPhoto} />
                                                ))}
                                            </ScrollView>
                                        )}
                                        {r.userId !== user.id && (
                                            <View style={styles.reviewModerationRow}>
                                                <TouchableOpacity style={styles.reviewModerationBtn} onPress={() => setReviewToReport(r)}>
                                                    <Feather name="flag" size={12} color="#9CA3AF" />
                                                    <Text style={styles.reviewModerationText}>Report</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.reviewModerationBtn} onPress={() => setReviewToBlock(r)}>
                                                    <Feather name="slash" size={12} color="#9CA3AF" />
                                                    <Text style={styles.reviewModerationText}>Block user</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
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

            {/* Sticky action bar */}
            <View style={[styles.stickyBar, { paddingBottom: 14 + insets.bottom }]}>
                <Pressable
                    style={styles.tryBtn}
                    onPress={() => { setDeliveryOption('instant'); handleAddToCart(true); }}
                >
                    <Shirt size={18} color={colors.textStrong} />
                    <Text style={styles.tryBtnText}>Try at door</Text>
                </Pressable>
                <Pressable style={styles.addBtn} onPress={() => handleAddToCart()}>
                    <ShoppingCart size={18} color={colors.textOnYellow} />
                    <Text style={styles.addBtnText}>Add · ₹{product.price.toLocaleString('en-IN')}</Text>
                </Pressable>
            </View>

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

            {/* Variant Unavailable Modal */}
            <ActionModal
                visible={!!unavailableMessage}
                title="Not Available"
                message={unavailableMessage || ''}
                icon="slash"
                primaryButtonText="OK"
                onPrimaryPress={() => setUnavailableMessage(null)}
                onClose={() => setUnavailableMessage(null)}
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

            <ActionModal
                visible={!!reviewToReport}
                title="Report review?"
                message="Report this review as abusive, offensive, or objectionable? Our team reviews reports within 24 hours."
                icon="flag"
                primaryButtonText={moderationBusy ? 'Reporting...' : 'Report'}
                onPrimaryPress={handleReportReview}
                secondaryButtonText="Cancel"
                onSecondaryPress={() => setReviewToReport(null)}
                onClose={() => setReviewToReport(null)}
            />

            <ActionModal
                visible={!!reviewToBlock}
                title="Block user?"
                message={`Block ${reviewToBlock?.user?.name || 'this user'}? You will no longer see their reviews.`}
                icon="slash"
                primaryButtonText={moderationBusy ? 'Blocking...' : 'Block'}
                onPrimaryPress={handleBlockUser}
                secondaryButtonText="Cancel"
                onSecondaryPress={() => setReviewToBlock(null)}
                onClose={() => setReviewToBlock(null)}
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
        fontFamily: fonts.displayBold,
        fontSize: 23,
        color: colors.textStrong,
        flex: 1,
        marginRight: 10,
        lineHeight: 27,
        letterSpacing: -0.4,
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
    sellerLine: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12
    },
    sellerOfflineLine: {
        fontSize: 13,
        color: '#b3261e',
        marginBottom: 12
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20
    },
    price: {
        fontFamily: fonts.displayBold,
        fontSize: 30,
        color: colors.textStrong,
        marginRight: 10,
        letterSpacing: -0.4,
    },
    originalPrice: {
        fontFamily: fonts.bodyRegular,
        fontSize: 16,
        color: colors.textFaint,
        textDecorationLine: 'line-through',
        marginRight: 10
    },
    discountText: {
        fontFamily: fonts.displayBold,
        fontSize: 15,
        color: palette.red500,
    },
    tryCard: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 22, overflow: 'hidden' },
    tryGlow: { position: 'absolute', right: -14, bottom: -20 },
    tryIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
    tryTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textInvert, marginBottom: 3 },
    tryDesc: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17, color: palette.neutral300 },
    tryHl: { fontFamily: fonts.bodyBold, color: palette.yellow300 },
    promiseRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
    promiseCard: { flex: 1, backgroundColor: palette.neutral50, borderWidth: 1, borderColor: palette.neutral100, borderRadius: radius.md, padding: 14 },
    promiseTitle: { fontFamily: fonts.displaySemiBold, fontSize: 13, color: colors.textStrong, marginTop: 8 },
    promiseSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint, marginTop: 1 },
    stickyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: palette.neutral100, paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
    tryBtn: { flex: 1, height: 54, borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    tryBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    addBtn: { flex: 1.3, height: 54, borderRadius: radius.md, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addBtnText: { fontFamily: fonts.bodyBlack, fontSize: 14, color: colors.textOnYellow },
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
    variantSwatch: {
        width: 64,
        marginRight: 12,
        alignItems: 'center',
    },
    variantSwatchImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    variantSwatchLabel: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
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
    reviewPhotoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    reviewPhotoStrip: {
        marginTop: 8,
    },
    reviewPhotoWrap: {
        position: 'relative',
    },
    reviewPhoto: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    reviewPhotoRemove: {
        position: 'absolute',
        top: -6,
        right: 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewPhotoAdd: {
        width: 64,
        height: 64,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: palette.yellow600,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    reviewPhotoAddText: {
        fontSize: 9,
        color: palette.yellow600,
        fontWeight: '600',
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
    reviewEula: {
        fontSize: 11,
        color: '#9CA3AF',
        lineHeight: 16,
        marginTop: 10,
    },
    reviewModerationRow: {
        flexDirection: 'row',
        gap: 18,
        marginTop: 8,
    },
    reviewModerationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewModerationText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '600',
    },
});
