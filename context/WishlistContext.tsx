import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Product } from '../constants/products';

const WISHLIST_STORAGE_KEY = '@ZPinEcom:wishlist';

interface WishlistContextType {
    wishlistItems: Product[];
    addToWishlist: (product: Product) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
    const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
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

    const saveWishlist = async (items: Product[]) => {
        try {
            await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
            // API: POST /api/v1/wishlist - Sync with backend
        } catch (error) {
            console.error('Error saving wishlist:', error);
        }
    };

    const addToWishlist = (product: Product) => {
        setWishlistItems(prev => {
            if (prev.some(item => item.id === product.id)) {
                return prev;
            }
            const newItems = [...prev, product];
            saveWishlist(newItems);
            return newItems;
        });
    };

    const removeFromWishlist = (productId: string) => {
        setWishlistItems(prev => {
            const newItems = prev.filter(item => item.id !== productId);
            saveWishlist(newItems);
            return newItems;
        });
    };

    const isInWishlist = (productId: string) => {
        return wishlistItems.some(item => item.id === productId);
    };

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            isInWishlist,
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
