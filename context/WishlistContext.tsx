import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ProductObject } from '../types/types';

const WISHLIST_STORAGE_KEY = '@ZPinEcom:wishlist';

interface WishlistContextType {
    wishlistItems: ProductObject[];
    addToWishlist: (product: ProductObject) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
    isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
    const [wishlistItems, setWishlistItems] = useState<ProductObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load wishlist from AsyncStorage on mount
    // API: GET /api/v1/wishlist - For server-side wishlist sync
    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        try {
            const wishlistData = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
            if (wishlistData) {
                setWishlistItems(JSON.parse(wishlistData));
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveWishlist = async (items: ProductObject[]) => {
        try {
            await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
            // API: POST /api/v1/wishlist - Sync with backend
        } catch (error) {
            console.error('Error saving wishlist:', error);
        }
    };

    const addToWishlist = (product: ProductObject) => {
        setWishlistItems(prev => {
            if (prev.some(item => item.productId === product.productId)) {
                return prev;
            }
            const newItems = [...prev, product];
            saveWishlist(newItems);
            return newItems;
        });
    };

    const removeFromWishlist = (productId: string) => {
        setWishlistItems(prev => {
            const newItems = prev.filter(item => item.productId !== productId);
            saveWishlist(newItems);
            return newItems;
        });
    };

    const isInWishlist = (productId: string) => {
        return wishlistItems.some(item => item.productId === productId);
    };

    const clearWishlist = () => {
        setWishlistItems([]);
        AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);
    };

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            isInWishlist,
            clearWishlist,
            isLoading
        }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};
