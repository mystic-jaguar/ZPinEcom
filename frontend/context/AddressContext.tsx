import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { userService } from '../services/user';
import { AddressObject } from '../types/types';
import { useUser } from './UserContext';

const ADDRESS_STORAGE_KEY = '@ZPinEcom:addresses';

interface AddressContextType {
    addresses: AddressObject[];
    addAddress: (address: Omit<AddressObject, 'id'>) => Promise<void>;
    removeAddress: (id: string) => void;
    setDefaultAddress: (id: string) => void;
    updateAddress: (id: string, address: Omit<AddressObject, 'id'>) => void;
    getDefaultAddress: () => AddressObject | undefined;
    isLoading: boolean;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

function normalizeAddress(raw: any): AddressObject {
    return {
        id: raw.id,
        name: raw.name,
        phone: raw.phone,
        address: raw.address_line1 || raw.address || '',
        addressLine1: raw.address_line1 || raw.addressLine1 || '',
        addressLine2: raw.address_line2 || raw.addressLine2 || '',
        city: raw.city,
        state: raw.state,
        pincode: raw.pincode,
        country: raw.country || 'India',
        landmark: raw.landmark || '',
        label: raw.label || 'Home',
        isDefault: raw.is_default ?? raw.isDefault ?? false,
    };
}

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [addresses, setAddresses] = useState<AddressObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    useEffect(() => {
        if (!isUserLoading) {
            loadAddresses();
        }
    }, [isAuthenticated, isUserLoading]);

    const loadAddresses = async () => {
        try {
            if (isAuthenticated) {
                try {
                    const response = await userService.getShippingAddresses();
                    const raw = (response as any).data || [];
                    if (Array.isArray(raw) && raw.length > 0) {
                        const normalized = raw.map(normalizeAddress);
                        setAddresses(normalized);
                        await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(normalized));
                        return;
                    }
                } catch (apiError) {
                    console.warn('Failed to load addresses from server:', apiError);
                }
            }
            // Fallback to local storage
            const stored = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
            if (stored) setAddresses(JSON.parse(stored));
        } catch (err) {
            console.error('Error loading addresses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const addAddress = async (newAddress: Omit<AddressObject, 'id'>) => {
        try {
            if (isAuthenticated) {
                const response = await userService.addShippingAddress({
                    name: newAddress.name,
                    phone: newAddress.phone,
                    addressLine1: newAddress.addressLine1 || newAddress.address,
                    addressLine2: newAddress.addressLine2,
                    city: newAddress.city,
                    state: newAddress.state,
                    pincode: newAddress.pincode,
                    country: newAddress.country || 'India',
                    landmark: newAddress.landmark,
                    label: newAddress.label,
                    isDefault: newAddress.isDefault,
                });
                const saved = (response as any).data;
                if (saved) {
                    await loadAddresses(); // Reload from server to get real IDs
                    return;
                }
            }
        } catch (err) {
            console.warn('Failed to save address to server, saving locally:', err);
        }

        // Local fallback
        const id = Math.random().toString(36).substr(2, 9);
        const addressWithId: AddressObject = { ...newAddress, id };
        setAddresses(prev => {
            const updated = newAddress.isDefault
                ? [...prev.map(a => ({ ...a, isDefault: false })), addressWithId]
                : [...prev, addressWithId];
            AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const removeAddress = (id: string) => {
        setAddresses(prev => {
            const updated = prev.filter(a => a.id !== id);
            AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const setDefaultAddress = (id: string) => {
        setAddresses(prev => {
            const updated = prev.map(a => ({ ...a, isDefault: a.id === id }));
            AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const updateAddress = (id: string, updatedAddress: Omit<AddressObject, 'id'>) => {
        setAddresses(prev => {
            const updated = prev.map(a => {
                if (a.id === id) return { ...updatedAddress, id };
                if (updatedAddress.isDefault) return { ...a, isDefault: false };
                return a;
            });
            AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const getDefaultAddress = () => addresses.find(a => a.isDefault);

    return (
        <AddressContext.Provider value={{
            addresses,
            addAddress,
            removeAddress,
            setDefaultAddress,
            updateAddress,
            getDefaultAddress,
            isLoading,
        }}>
            {children}
        </AddressContext.Provider>
    );
};

export const useAddress = () => {
    const context = useContext(AddressContext);
    if (!context) throw new Error('useAddress must be used within an AddressProvider');
    return context;
};
