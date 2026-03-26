import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { wishlistService } from '../services/wishlist';
import { ProductObject } from '../types/types';
import { useUser } from './UserContext';

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

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    // Load wishlist from AsyncStorage on mount and sync if auth changes
    useEffect(() => {
        if (!isUserLoading) {
            loadWishlist();
        }
    }, [isAuthenticated, isUserLoading]);

    const loadWishlist = async () => {
        try {
            if (isAuthenticated) {
                const token = await tokenManager.getAccessToken();
                if (token && token !== 'null' && token !== 'undefined') {
                    try {
                        const response = await wishlistService.getWishlist();
                        // Backend: { success, data: [{ productId, productName, price, images, inStock }] }
                        const raw = (response as any).data || (response as any).wishlist || [];
                        if (Array.isArray(raw)) {
                            const normalized: ProductObject[] = raw.map((item: any) => ({
                                productId: item.productId || item.product_id,
                                productName: item.productName || item.product_name || '',
                                price: Number(item.price) || 0,
                                images: item.images || [],
                                inStock: item.inStock ?? item.in_stock ?? true,
                                userId: item.userId || '',
                                description: item.description || '',
                                categoryId: item.categoryId || '',
                                deepestCategoryName: item.deepestCategoryName || '',
                                categoryPath: item.categoryPath || 'All',
                                quantity: item.quantity || 0,
                                sellerLocation: item.sellerLocation || { city: '', state: '', pincode: '', coordinates: { type: 'Point', coordinates: [0, 0] } },
                                timeStamp: item.timeStamp || item.created_at || new Date().toISOString(),
                            }));
                            setWishlistItems(normalized);
                            await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalized));
                            return;
                        }
                    } catch (apiError) {
                        console.warn('Failed to load wishlist from server:', apiError);
                    }
                }
            }

            const wishlistData = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
            if (!isAuthenticated && wishlistData) {
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
        } catch (error) {
            console.error('Error saving wishlist:', error);
        }
    };

    const addToWishlist = async (product: ProductObject) => {
        // Optimistic update
        setWishlistItems(prev => {
            if (prev.some(item => item.productId === product.productId)) {
                return prev;
            }
            const newItems = [...prev, product];
            saveWishlist(newItems);
            return newItems;
        });

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.addToWishlist(product.productId);
            }
        } catch (error) {
            console.error('Error syncing add to wishlist:', error);
        }
    };

    const removeFromWishlist = async (productId: string) => {
        // Optimistic update
        setWishlistItems(prev => {
            const newItems = prev.filter(item => item.productId !== productId);
            saveWishlist(newItems);
            return newItems;
        });

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.removeFromWishlist(productId);
            }
        } catch (error) {
            console.error('Error syncing remove from wishlist:', error);
        }
    };

    const isInWishlist = (productId: string) => {
        return wishlistItems.some(item => item.productId === productId);
    };

    const clearWishlist = async () => {
        setWishlistItems([]);
        AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);

        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.clearWishlist();
            }
        } catch (error) {
            console.error('Error syncing clear wishlist:', error);
        }
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
