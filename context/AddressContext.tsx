import React, { createContext, ReactNode, useContext, useState } from 'react';
import { AddressObject } from '../types/types';

interface AddressContextType {
    addresses: AddressObject[];
    addAddress: (address: Omit<AddressObject, 'id'>) => void;
    removeAddress: (id: string) => void;
    setDefaultAddress: (id: string) => void;
    updateAddress: (id: string, address: Omit<AddressObject, 'id'>) => void;
    getDefaultAddress: () => AddressObject | undefined;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const DUMMY_ADDRESSES: AddressObject[] = [
    {
        id: '1',
        name: 'Jay',
        phone: '9876543210',
        address: '123, Green Park Society, Main Road',
        addressLine1: '123, Green Park Society',
        addressLine2: 'Main Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
        country: 'India',
        landmark: 'Near Central Mall',
        label: 'Home',
        isDefault: true,
        coordinates: {
            type: 'Point',
            coordinates: [72.5714, 23.0225] // Ahmedabad coordinates
        }
    },
    {
        id: '2',
        name: 'Jay Office',
        phone: '9876543210',
        address: '404, Tech Hub, Cyber City',
        addressLine1: '404, Tech Hub',
        addressLine2: 'Cyber City',
        city: 'Gandhinagar',
        state: 'Gujarat',
        pincode: '382007',
        country: 'India',
        landmark: 'Near GIFT City',
        label: 'Work',
        isDefault: false,
        coordinates: {
            type: 'Point',
            coordinates: [72.6369, 23.2156] // Gandhinagar coordinates
        }
    }
];

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [addresses, setAddresses] = useState<AddressObject[]>(DUMMY_ADDRESSES);

    const addAddress = (newAddress: Omit<AddressObject, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const addressWithId: AddressObject = { ...newAddress, id };

        setAddresses(prev => {
            if (newAddress.isDefault) {
                return [...prev.map(a => ({ ...a, isDefault: false })), addressWithId];
            }
            return [...prev, addressWithId];
        });
    };

    const removeAddress = (id: string) => {
        setAddresses(prev => prev.filter(a => a.id !== id));
    };

    const setDefaultAddress = (id: string) => {
        setAddresses(prev => prev.map(a => ({
            ...a,
            isDefault: a.id === id
        })));
    };

    const updateAddress = (id: string, updatedAddress: Omit<AddressObject, 'id'>) => {
        setAddresses(prev => prev.map(a => {
            if (a.id === id) {
                // If isDefault is being set to true, unset all others
                if (updatedAddress.isDefault) {
                    return { ...updatedAddress, id };
                }
                return { ...updatedAddress, id };
            }
            // If the updated address is being set as default, unset others
            if (updatedAddress.isDefault && a.isDefault) {
                return { ...a, isDefault: false };
            }
            return a;
        }));
    };

    const getDefaultAddress = () => {
        return addresses.find(a => a.isDefault);
    };

    return (
        <AddressContext.Provider value={{
            addresses,
            addAddress,
            removeAddress,
            setDefaultAddress,
            updateAddress,
            getDefaultAddress
        }}>
            {children}
        </AddressContext.Provider>
    );
};

export const useAddress = () => {
    const context = useContext(AddressContext);
    if (!context) {
        throw new Error('useAddress must be used within an AddressProvider');
    }
    return context;
};
