import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { COUPONS } from '../constants/coupons';
import { tokenManager } from '../services/api';
import { cartService } from '../services/cart';
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
    applyCoupon: (code: string) => { success: boolean; message: string };
    removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItemObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    // Load cart from AsyncStorage on mount and sync if auth changes
    useEffect(() => {
        if (!isUserLoading) {
            loadCart();
        }
    }, [isAuthenticated, isUserLoading]);

    const loadCart = async () => {
        try {
            // Try loading from backend first if logged in
            if (isAuthenticated) {
                const token = await tokenManager.getAccessToken();
                if (token && token !== 'null' && token !== 'undefined') {
                    try {
                        const response = await cartService.getCart();
                        if (response.success && response.data) {
                            setCartItems(response.data.cart);
                            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(response.data.cart));
                            return; // Successfully loaded from backend
                        }
                    } catch (apiError) {
                        console.warn('Failed to load cart from backend:', apiError);
                    }
                }
            }

            // Fallback to local storage (for guests or failed backend load)
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

    const saveCart = async (items: CartItemObject[]) => {
        try {
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    };

    const addToCart = async (product: ProductObject, selectedColor?: string, selectedSize?: string) => {
        // Optimistic update
        const cartItemId = `${product.productId}-${selectedColor || 'default'}-${selectedSize || 'default'}`;
        let quantityToAdd = 1;

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
            saveCart(newItems);
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
        }
    };

    const removeFromCart = async (cartItemId: string) => {
        // Find product ID from cart item (assuming cartItemId contains it or we look it up)
        // Since cartItemId is composite, we need finding the item
        const itemToRemove = cartItems.find(item => item.cartItemId === cartItemId);
        const productId = itemToRemove?.productId;

        setCartItems(prevItems => {
            const newItems = prevItems.filter(item => item.cartItemId !== cartItemId);
            saveCart(newItems);
            return newItems;
        });

        if (productId) {
            try {
                const token = await tokenManager.getAccessToken();
                if (token) {
                    await cartService.removeFromCart(productId);
                }
            } catch (error) {
                console.error('Error syncing remove from cart:', error);
            }
        }
    };

    const updateQuantity = async (cartItemId: string, quantity: number) => {
        if (quantity < 1) {
            await removeFromCart(cartItemId);
            return;
        }
        const itemToUpdate = cartItems.find(item => item.cartItemId === cartItemId);
        const productId = itemToUpdate?.productId;

        setCartItems(prevItems => {
            const newItems = prevItems.map(item =>
                item.cartItemId === cartItemId
                    ? { ...item, quantity }
                    : item
            );
            saveCart(newItems);
            return newItems;
        });

        if (productId) {
            try {
                const token = await tokenManager.getAccessToken();
                if (token) {
                    await cartService.updateCartItem(productId, { quantity });
                }
            } catch (error) {
                console.error('Error syncing update quantity:', error);
            }
        }
    };

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

    // Mock Coupons
    // Mock Coupons
    // Replaced with imported COUPONS constant
    const AVAILABLE_COUPONS: CouponObject[] = COUPONS;

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSavings = cartItems.reduce((sum, item) => {
        const originalPrice = item.product.originalPrice || item.product.price;
        return sum + ((originalPrice - item.product.price) * item.quantity);
    }, 0);

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

    const applyCoupon = (code: string) => {
        const coupon = AVAILABLE_COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());

        if (!coupon) {
            return { success: false, message: 'Invalid coupon code' };
        }

        if (totalPrice < coupon.minOrderValue) {
            return { success: false, message: `Minimum order value of ₹${coupon.minOrderValue} required` };
        }

        setAppliedCoupon(coupon);
        return { success: true, message: 'Coupon applied successfully' };
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
