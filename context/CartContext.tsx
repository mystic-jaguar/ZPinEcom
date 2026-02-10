import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { CartItemObject, ProductObject } from '../types/types';

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItemObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load cart from AsyncStorage on mount
    // API: GET /api/v1/cart - For server-side cart persistence
    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
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
            // API: POST /api/v1/cart - Sync with backend
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    };

    const addToCart = (product: ProductObject, selectedColor?: string, selectedSize?: string) => {
        const cartItemId = `${product.productId}-${selectedColor || 'default'}-${selectedSize || 'default'}`;

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
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems(prevItems => {
            const newItems = prevItems.filter(item => item.cartItemId !== cartItemId);
            saveCart(newItems);
            return newItems;
        });
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(cartItemId);
            return;
        }

        setCartItems(prevItems => {
            const newItems = prevItems.map(item =>
                item.cartItemId === cartItemId
                    ? { ...item, quantity }
                    : item
            );
            saveCart(newItems);
            return newItems;
        });
    };

    const clearCart = async () => {
        setCartItems([]);
        await AsyncStorage.removeItem(CART_STORAGE_KEY);
        // API: DELETE /api/v1/cart - Clear cart on backend
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSavings = cartItems.reduce((sum, item) => {
        const originalPrice = item.product.originalPrice || item.product.price;
        return sum + ((originalPrice - item.product.price) * item.quantity);
    }, 0);

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
            isLoading
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
