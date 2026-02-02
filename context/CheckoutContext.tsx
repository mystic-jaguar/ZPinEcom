import React, { createContext, ReactNode, useContext, useState } from 'react';

interface CheckoutContextType {
    selectedAddressId: string | null;
    setSelectedAddressId: (id: string | null) => void;
    selectedPaymentMethod: string | null; // e.g., 'Google Pay', 'COD', 'Card'
    setSelectedPaymentMethod: (method: string | null) => void;
    deliveryType: 'Standard' | 'Instant';
    setDeliveryType: (type: 'Standard' | 'Instant') => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [deliveryType, setDeliveryType] = useState<'Standard' | 'Instant'>('Standard');

    return (
        <CheckoutContext.Provider value={{
            selectedAddressId,
            setSelectedAddressId,
            selectedPaymentMethod,
            setSelectedPaymentMethod,
            deliveryType,
            setDeliveryType,
        }}>
            {children}
        </CheckoutContext.Provider>
    );
};

export const useCheckout = () => {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckout must be used within a CheckoutProvider');
    }
    return context;
};
