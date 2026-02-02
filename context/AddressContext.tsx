import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Address {
    id: string;
    name: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string;
    phoneNumber: string;
    isDefault: boolean;
    type: 'Home' | 'Work' | 'Other';
}

interface AddressContextType {
    addresses: Address[];
    addAddress: (address: Omit<Address, 'id'>) => void;
    removeAddress: (id: string) => void;
    setDefaultAddress: (id: string) => void;
    updateAddress: (id: string, address: Omit<Address, 'id'>) => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const DUMMY_ADDRESSES: Address[] = [
    {
        id: '1',
        name: 'Jay',
        addressLine: '123, Green Park Society, Main Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
        country: 'India',
        phoneNumber: '9876543210',
        isDefault: true,
        type: 'Home'
    },
    {
        id: '2',
        name: 'Jay Office',
        addressLine: '404, Tech Hub, Cyber City',
        city: 'Gandhinagar',
        state: 'Gujarat',
        pincode: '382007',
        country: 'India',
        phoneNumber: '9876543210',
        isDefault: false,
        type: 'Work'
    }
];

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [addresses, setAddresses] = useState<Address[]>(DUMMY_ADDRESSES);

    const addAddress = (newAddress: Omit<Address, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const addressWithId = { ...newAddress, id };

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

    const updateAddress = (id: string, updatedAddress: Omit<Address, 'id'>) => {
        setAddresses(prev => prev.map(a =>
            a.id === id ? { ...updatedAddress, id } : a
        ));
    };

    return (
        <AddressContext.Provider value={{
            addresses,
            addAddress,
            removeAddress,
            setDefaultAddress,
            updateAddress
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
