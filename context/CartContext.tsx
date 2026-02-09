import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Product } from '../constants/products';

const CART_STORAGE_KEY = '@ZPinEcom:cart';

export interface CartItem extends Product {
    cartId: string; // Unique ID for the cart item (productID + variant)
    quantity: number;
    selectedColor: string;
    selectedSize: string;
    originalPrice?: number; // For savings calculation
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, selectedColor: string, selectedSize: string) => void;
    removeFromCart: (cartId: string) => void;
    updateQuantity: (cartId: string, quantity: number) => void;
    clearCart: () => void;
    totalPrice: number;
    totalItems: number;
    totalSavings: number;
    isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
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

    const saveCart = async (items: CartItem[]) => {
        try {
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
            // API: POST /api/v1/cart - Sync with backend
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    };

    const addToCart = (product: Product, selectedColor: string, selectedSize: string) => {
        const cartId = `${product.id}-${selectedColor}-${selectedSize}`;

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.cartId === cartId);

            let newItems: CartItem[];
            if (existingItem) {
                newItems = prevItems.map(item =>
                    item.cartId === cartId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                newItems = [...prevItems, {
                    ...product,
                    quantity: 1,
                    selectedColor,
                    selectedSize,
                    cartId,
                    originalPrice: product.originalPrice || product.price
                }];
            }

            saveCart(newItems);
            return newItems;
        });
    };

    const removeFromCart = (cartId: string) => {
        setCartItems(prevItems => {
            const newItems = prevItems.filter(item => item.cartId !== cartId);
            saveCart(newItems);
            return newItems;
        });
    };

    const updateQuantity = (cartId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(cartId);
            return;
        }

        setCartItems(prevItems => {
            const newItems = prevItems.map(item =>
                item.cartId === cartId
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

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSavings = cartItems.reduce((sum, item) => {
        const originalPrice = item.originalPrice || item.price;
        return sum + ((originalPrice - item.price) * item.quantity);
    }, 0);

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
