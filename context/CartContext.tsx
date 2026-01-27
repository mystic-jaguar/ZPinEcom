import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Product } from '../constants/products';

export interface CartItem extends Product {
    cartId: string; // Unique ID for the cart item (productID + variant)
    quantity: number;
    selectedColor: string;
    selectedSize: string;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, selectedColor: string, selectedSize: string) => void;
    removeFromCart: (cartId: string) => void;
    updateQuantity: (cartId: string, quantity: number) => void;
    clearCart: () => void;
    totalPrice: number;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = (product: Product, selectedColor: string, selectedSize: string) => {
        const cartId = `${product.id}-${selectedColor}-${selectedSize}`;

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.cartId === cartId);

            if (existingItem) {
                return prevItems.map(item =>
                    item.cartId === cartId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [...prevItems, {
                ...product,
                quantity: 1,
                selectedColor,
                selectedSize,
                cartId
            }];
        });
    };

    const removeFromCart = (cartId: string) => {
        setCartItems(prevItems => prevItems.filter(item => item.cartId !== cartId));
    };

    const updateQuantity = (cartId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(cartId);
            return;
        }

        setCartItems(prevItems =>
            prevItems.map(item =>
                item.cartId === cartId
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalPrice,
            totalItems
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
