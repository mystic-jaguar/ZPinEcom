import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { tokenManager } from '../services/api';
import { cartService } from '../services/cart';
import { couponService } from '../services/coupon';
import { CartItemObject, CouponObject, ProductObject } from '../types/types';
import { useUser } from './UserContext';

const CART_STORAGE_KEY = '@ZPinEcom:cart';

interface CartContextType {
    cartItems: CartItemObject[];
    addToCart: (product: ProductObject, selectedColor?: string, selectedSize?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItemObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    // Always-current cart snapshot so the memoized handlers below can read the
    // latest items without listing cartItems as a dependency (which would give
    // them a new identity on every change and re-render every CartItem row).
    const cartItemsRef = useRef(cartItems);
    cartItemsRef.current = cartItems;

    // Load cart from AsyncStorage on mount and sync if auth changes
    useEffect(() => {
        if (!isUserLoading) {
            loadCart();
        }
    }, [isAuthenticated, isUserLoading]);

    const loadCart = async () => {
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
                            }));
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
            if (cartData) {
                setCartItems(JSON.parse(cartData));
            }
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setIsLoading(false);
        }
    };

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

    const addToCart = async (product: ProductObject, selectedColor?: string, selectedSize?: string) => {
        // Optimistic update
        const cartItemId = `${product.productId}-${selectedColor || 'default'}-${selectedSize || 'default'}`;
        const previousItems = cartItems;

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.cartItemId === cartItemId);
            let newItems: CartItemObject[];

            if (existingItem) {
                newItems = prevItems.map(item =>
                    item.cartItemId === cartItemId
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
                await cartService.addToCart({ productId: product.productId, quantity: 1 });
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

        const previousItems = cartItemsRef.current;
        setCartItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId));

        if (productId) {
            try {
                const token = await tokenManager.getAccessToken();
                if (token) {
                    await cartService.removeFromCart(productId);
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
                    await cartService.updateCartItem(productId, { quantity });
                }
            } catch (error) {
                console.error('Error syncing update quantity:', error);
                // Rollback on failure (persistence effect re-saves)
                setCartItems(previousItems);
                throw error;
            }
        }
    }, [removeFromCart]);

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

    // Fetch available coupons from backend on mount
    useEffect(() => {
        couponService.getCoupons()
            .then(setAvailableCoupons)
            .catch(() => {}); // fail silently — coupons are non-critical
    }, []);

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
            clearCart,
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
            removeCoupon
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
