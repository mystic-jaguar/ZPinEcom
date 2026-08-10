import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { tokenManager } from '../services/api';
import { cartService } from '../services/cart';
import { couponService } from '../services/coupon';
import { CartItemObject, CouponObject, ProductObject } from '../types/types';
import { useNetwork } from './NetworkContext';
import { useUser } from './UserContext';
import { useWishlist } from './WishlistContext';

const CART_STORAGE_KEY = '@ZPinEcom:cart';

/**
 * Thrown when a cart write would exceed what the seller actually has in stock.
 * The server is the authority (it re-checks and 400s), but the client knows the
 * per-line stock from GET /cart and refuses first so the user gets the real
 * number — "Only 5 left in stock" — instead of a generic failure.
 */
export class StockLimitError extends Error {
    constructor(public available: number) {
        super(available <= 0 ? 'This item is out of stock.' : `Only ${available} left in stock.`);
        this.name = 'StockLimitError';
    }
}

interface CartContextType {
    cartItems: CartItemObject[];
    addToCart: (product: ProductObject, selectedColor?: string, selectedSize?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    changeSize: (cartItemId: string, size: string) => Promise<void>;
    clearCart: () => void;
    refreshCart: () => Promise<void>;
    /** Units of `product` still addable, given what is already in the cart. */
    remainingStock: (product: ProductObject, selectedSize?: string) => number;
    totalPrice: number;
    totalItems: number;
    totalSavings: number;
    hasUnavailableItems: boolean;
    hasPriceChanges: boolean;
    isLoading: boolean;
    appliedCoupon: CouponObject | null;
    couponDiscount: number;
    availableCoupons: CouponObject[];
    applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
    removeCoupon: () => void;
    refreshCoupons: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItemObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();
    const { onReconnect } = useNetwork();
    const { isInWishlist, removeFromWishlist } = useWishlist();

    // Always-current cart snapshot so the memoized handlers below can read the
    // latest items without listing cartItems as a dependency (which would give
    // them a new identity on every change and re-render every CartItem row).
    const cartItemsRef = useRef(cartItems);
    cartItemsRef.current = cartItems;

    // Sequence counters used by loadCart to discard responses that have been
    // overtaken — by a newer fetch, or by a local write started after it.
    const loadSeqRef = useRef(0);
    const writeSeqRef = useRef(0);

    // Stable identity: cart.tsx passes refreshCart to useFocusEffect, and a new
    // function every render made that effect re-fire on every render — an endless
    // GET /cart loop that both tripped the rate limiter and flickered the stepper
    // (a stale in-flight response overwriting the optimistic quantity).
    const loadCart = useCallback(async () => {
        // Drop a server cart that was fetched before a local write: it is older
        // than what the user just did, and applying it rewinds the stepper.
        const seq = ++loadSeqRef.current;
        const writesAtStart = writeSeqRef.current;
        const isStale = () => seq !== loadSeqRef.current || writesAtStart !== writeSeqRef.current;
        try {
            if (isAuthenticated) {
                const token = await tokenManager.getAccessToken();
                if (token && token !== 'null' && token !== 'undefined') {
                    try {
                        const response = await cartService.getCart();
                        // Backend: { success, data: { cart, totalItems, totalAmount, ... } }
                        const cartData = (response as any).data?.cart || (response as any).cart || [];
                        if (Array.isArray(cartData)) {
                            // Normalize backend cart items to match CartItemObject shape
                            const normalized = cartData.map((item: any) => ({
                                cartItemId: item.cartItemId || item.id,
                                productId: item.productId || item.product_id,
                                product: item.product || {
                                    productId: item.productId || item.product_id,
                                    productName: item.product?.productName || item.productName || '',
                                    price: Number(item.product?.price || item.priceAtAdd || 0),
                                    images: item.product?.images || [],
                                    inStock: item.product?.inStock ?? true,
                                },
                                quantity: item.quantity,
                                priceAtAdd: Number(item.priceAtAdd || item.price_at_add || 0),
                                isAvailable: item.isAvailable ?? true,
                                timeStamp: item.timeStamp || item.created_at || new Date().toISOString(),
                                // The size the line was added in, plus the sizes it can be
                                // switched to (per-size stock), so the cart row can offer
                                // an inline size change like the website does.
                                selectedSize: item.selectedSize || item.variant || undefined,
                                sizeQuantities: item.sizeQuantities || undefined,
                                availableStock: item.availableStock ?? undefined,
                            }));
                            if (isStale()) return;
                            setCartItems(normalized);
                            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
                            return;
                        }
                    } catch (apiError) {
                        console.warn('Failed to load cart from backend:', apiError);
                    }
                }
            }

            // Fallback to local storage
            const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (cartData && !isStale()) {
                setCartItems(JSON.parse(cartData));
            }
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Load cart from AsyncStorage on mount and sync if auth changes
    useEffect(() => {
        if (!isUserLoading) {
            loadCart();
        }
    }, [isUserLoading, loadCart]);

    // Persist the cart whenever it changes (after the initial load). Centralizing
    // the write here means every committed change — optimistic updates and
    // rollbacks alike — is saved, instead of fire-and-forget writes buried inside
    // the state updaters (which could be lost if the component unmounted mid-write).
    useEffect(() => {
        if (isLoading) return; // don't clobber stored cart before loadCart() runs
        AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)).catch(err =>
            console.error('Error saving cart:', err)
        );
    }, [cartItems, isLoading]);

    // Stock for one product/size combination, preferring the value the server sent
    // with the cart line (authoritative and fresh) over the product payload.
    const stockFor = useCallback((product: ProductObject, selectedSize?: string) => {
        const line = cartItemsRef.current.find(
            i => i.productId === product.productId && (i.selectedSize || undefined) === (selectedSize || undefined)
        );
        if (typeof line?.availableStock === 'number') return line.availableStock;
        const sq = (product as any).sizeQuantities as Record<string, number> | undefined;
        if (selectedSize && sq && selectedSize in sq) return Number(sq[selectedSize] || 0);
        return Number(product.quantity ?? 0);
    }, []);

    const remainingStock = useCallback((product: ProductObject, selectedSize?: string) => {
        const inCart = cartItemsRef.current
            .filter(i => i.productId === product.productId && (i.selectedSize || undefined) === (selectedSize || undefined))
            .reduce((s, i) => s + i.quantity, 0);
        return Math.max(stockFor(product, selectedSize) - inCart, 0);
    }, [stockFor]);

    const addToCart = async (product: ProductObject, selectedColor?: string, selectedSize?: string) => {
        // Optimistic update
        const cartItemId = `${product.productId}-${selectedColor || 'default'}-${selectedSize || 'default'}`;
        const previousItems = cartItemsRef.current;
        // A line already in the cart is identified by product + size, NOT by the id
        // synthesized above: once the cart has been loaded from the server the line
        // carries a server UUID, so an id match always missed and re-adding the same
        // product appended a second row that vanished on the next refresh.
        const sameLine = (i: CartItemObject) =>
            i.productId === product.productId && (i.selectedSize || undefined) === (selectedSize || undefined);

        // Refuse before touching state: one more unit than the seller has is not
        // an error the user should discover at checkout.
        if (remainingStock(product, selectedSize) < 1) {
            throw new StockLimitError(stockFor(product, selectedSize));
        }
        writeSeqRef.current++;

        setCartItems(prevItems => {
            const existingItem = prevItems.find(sameLine);
            let newItems: CartItemObject[];

            if (existingItem) {
                newItems = prevItems.map(item =>
                    sameLine(item)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                const newCartItem: CartItemObject = {
                    cartItemId,
                    productId: product.productId,
                    product,
                    quantity: 1,
                    priceAtAdd: product.price,
                    isAvailable: product.inStock,
                    timeStamp: new Date().toISOString(),
                    selectedColor,
                    selectedSize
                };
                newItems = [...prevItems, newCartItem];
            }
            return newItems;
        });

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await cartService.addToCart({ productId: product.productId, quantity: 1, variant: selectedSize });
            }
            // An item that made it into the cart is no longer something to save for
            // later — drop it from the wishlist, whichever screen added it.
            if (isInWishlist(product.productId)) {
                removeFromWishlist(product.productId);
            }
        } catch (error) {
            console.error('Error syncing add to cart:', error);
            // Rollback optimistic update on failure (persistence effect re-saves)
            setCartItems(previousItems);
            throw error;
        }
    };

    const removeFromCart = useCallback(async (cartItemId: string) => {
        // Find product ID from cart item (assuming cartItemId contains it or we look it up)
        // Since cartItemId is composite, we need finding the item
        const itemToRemove = cartItemsRef.current.find(item => item.cartItemId === cartItemId);
        const productId = itemToRemove?.productId;
        const variant = itemToRemove?.selectedSize;

        writeSeqRef.current++;
        const previousItems = cartItemsRef.current;
        setCartItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId));

        if (productId) {
            try {
                const token = await tokenManager.getAccessToken();
                if (token) {
                    await cartService.removeFromCart(productId, variant);
                }
            } catch (error) {
                console.error('Error syncing remove from cart:', error);
                // Rollback on failure (persistence effect re-saves)
                setCartItems(previousItems);
                throw error;
            }
        }
    }, []);

    const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
        if (quantity < 1) {
            await removeFromCart(cartItemId);
            return;
        }
        const itemToUpdate = cartItemsRef.current.find(item => item.cartItemId === cartItemId);
        const productId = itemToUpdate?.productId;
        const variant = itemToUpdate?.selectedSize;

        // Cap on real stock. Increasing past it is refused with the actual number
        // so the caller can say "Only N left in stock"; decreasing is always fine
        // (a line can already sit above stock if the seller cut it after adding).
        if (itemToUpdate && quantity > itemToUpdate.quantity) {
            const available = typeof itemToUpdate.availableStock === 'number'
                ? itemToUpdate.availableStock
                : stockFor(itemToUpdate.product, variant);
            if (quantity > available) throw new StockLimitError(available);
        }

        writeSeqRef.current++;
        const previousItems = cartItemsRef.current;
        setCartItems(prevItems => prevItems.map(item =>
            item.cartItemId === cartItemId
                ? { ...item, quantity }
                : item
        ));

        if (productId) {
            try {
                const token = await tokenManager.getAccessToken();
                if (token) {
                    await cartService.updateCartItem(productId, { quantity, variant });
                }
            } catch (error) {
                console.error('Error syncing update quantity:', error);
                // Rollback on failure (persistence effect re-saves)
                setCartItems(previousItems);
                throw error;
            }
        }
    }, [removeFromCart, stockFor]);

    // Change a cart line's size in place (website parity: the cart lets you fix a
    // wrong size without removing and re-adding the item). Reloads from the server
    // afterwards because the backend merges the line if that size is already in
    // the cart, and only it knows the merged result.
    const changeSize = useCallback(async (cartItemId: string, size: string) => {
        const item = cartItemsRef.current.find(i => i.cartItemId === cartItemId);
        if (!item || item.selectedSize === size) return;

        writeSeqRef.current++;
        const previousItems = cartItemsRef.current;
        setCartItems(prev => prev.map(i =>
            i.cartItemId === cartItemId ? { ...i, selectedSize: size } : i
        ));

        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await cartService.updateCartItem(item.productId, {
                    quantity: item.quantity,
                    variant: item.selectedSize,
                    newVariant: size,
                });
                await loadCart();
            }
        } catch (error) {
            console.error('Error syncing size change:', error);
            setCartItems(previousItems);
            throw error;
        }
    }, [loadCart]);

    const clearCart = async () => {
        setCartItems([]);
        setAppliedCoupon(null);
        await AsyncStorage.removeItem(CART_STORAGE_KEY);

        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await cartService.clearCart();
            }
        } catch (error) {
            console.error('Error syncing clear cart:', error);
        }
    };

    const [appliedCoupon, setAppliedCoupon] = useState<CouponObject | null>(null);
    const [availableCoupons, setAvailableCoupons] = useState<CouponObject[]>([]);

    // Fetch available coupons from backend. Exposed so screens can retry after a
    // cold-start failure (Render backend spins down when idle → first boot fetch
    // can time out, and a one-shot mount fetch would leave the list empty forever).
    const refreshCoupons = useCallback(async () => {
        try {
            setAvailableCoupons(await couponService.getCoupons());
        } catch { /* non-critical — leave existing list, caller may retry on focus */ }
    }, []);

    useEffect(() => { refreshCoupons(); }, [refreshCoupons]);

    // Connectivity came back — re-pull the two things a dropped connection
    // most likely left stale/empty, instead of waiting for the next screen focus.
    useEffect(() => onReconnect(() => { loadCart(); refreshCoupons(); }), [onReconnect, refreshCoupons, loadCart]);

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSavings = cartItems.reduce((sum, item) => {
        const originalPrice = item.product.originalPrice || item.product.price;
        return sum + ((originalPrice - item.product.price) * item.quantity);
    }, 0);

    // Auto-remove coupon if cart total drops below minOrderValue
    useEffect(() => {
        if (appliedCoupon && totalPrice < appliedCoupon.minOrderValue) {
            setAppliedCoupon(null);
        }
    }, [totalPrice, appliedCoupon]);

    // Calculate Coupon Discount
    const couponDiscount = React.useMemo(() => {
        if (!appliedCoupon) return 0;
        if (totalPrice < appliedCoupon.minOrderValue) return 0;

        let discount = 0;
        if (appliedCoupon.discountType === 'percentage') {
            discount = (totalPrice * appliedCoupon.discountValue) / 100;
            if (appliedCoupon.maxDiscount) {
                discount = Math.min(discount, appliedCoupon.maxDiscount);
            }
        } else {
            discount = appliedCoupon.discountValue;
        }

        return discount;
    }, [totalPrice, appliedCoupon]);

    const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
        try {
            const result = await couponService.validateCoupon(code, totalPrice);
            setAppliedCoupon(result);
            return { success: true, message: 'Coupon applied successfully' };
        } catch (error: any) {
            return { success: false, message: error.message || 'Invalid coupon code' };
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
    };

    const hasUnavailableItems = cartItems.some(item => !item.isAvailable);
    const hasPriceChanges = cartItems.some(item => item.priceAtAdd !== item.product.price);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            changeSize,
            clearCart,
            refreshCart: loadCart,
            remainingStock,
            totalPrice,
            totalItems,
            totalSavings,
            hasUnavailableItems,
            hasPriceChanges,
            isLoading,
            appliedCoupon,
            couponDiscount,
            availableCoupons,
            applyCoupon,
            removeCoupon,
            refreshCoupons
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
