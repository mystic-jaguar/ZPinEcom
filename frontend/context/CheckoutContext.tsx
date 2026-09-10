import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const CHECKOUT_STORAGE_KEY = '@ZPinEcom:checkout';

interface CheckoutContextType {
    selectedAddressId: string | null;
    setSelectedAddressId: (id: string | null) => void;
    selectedPaymentMethod: string | null; // e.g., 'Google Pay', 'COD', 'Card'
    setSelectedPaymentMethod: (method: string | null) => void;
    deliveryType: 'Standard' | 'Instant';
    setDeliveryType: (type: 'Standard' | 'Instant') => void;
    /** Furthest checkout step reached (1 address, 2 summary, 3 payment) — restored on relaunch. */
    lastStep: number;
    setLastStep: (step: number) => void;
    /** Clear persisted checkout state — call after an order is placed. */
    resetCheckout: () => void;
    /** False until the persisted state has been read back. */
    isRestored: boolean;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    // Instant (Try-at-Door) is the default offer — the product page's Buy now and
    // the summary's delivery picker both start on it.
    const [deliveryType, setDeliveryType] = useState<'Standard' | 'Instant'>('Instant');
    const [lastStep, setLastStep] = useState(1);
    const [isRestored, setIsRestored] = useState(false);

    // Restore an in-progress checkout after a kill/relaunch, mirroring how
    // CartContext persists the cart. Only the *selections* are stored — never
    // any money figure, which the server recomputes on every request anyway.
    useEffect(() => {
        AsyncStorage.getItem(CHECKOUT_STORAGE_KEY)
            .then(raw => {
                if (raw) {
                    const saved = JSON.parse(raw);
                    setSelectedAddressId(saved.selectedAddressId ?? null);
                    setSelectedPaymentMethod(saved.selectedPaymentMethod ?? null);
                    setDeliveryType(saved.deliveryType === 'Standard' ? 'Standard' : 'Instant');
                    setLastStep(saved.lastStep ?? 1);
                }
            })
            .catch(err => console.error('Error loading checkout state:', err))
            .finally(() => setIsRestored(true));
    }, []);

    useEffect(() => {
        if (!isRestored) return; // don't clobber stored state before the load runs
        AsyncStorage.setItem(
            CHECKOUT_STORAGE_KEY,
            JSON.stringify({ selectedAddressId, selectedPaymentMethod, deliveryType, lastStep }),
        ).catch(err => console.error('Error saving checkout state:', err));
    }, [selectedAddressId, selectedPaymentMethod, deliveryType, lastStep, isRestored]);

    const resetCheckout = React.useCallback(() => {
        setSelectedPaymentMethod(null);
        setDeliveryType('Instant');
        setLastStep(1);
        AsyncStorage.removeItem(CHECKOUT_STORAGE_KEY).catch(() => { });
    }, []);

    return (
        <CheckoutContext.Provider value={{
            selectedAddressId,
            setSelectedAddressId,
            selectedPaymentMethod,
            setSelectedPaymentMethod,
            deliveryType,
            setDeliveryType,
            lastStep,
            setLastStep,
            resetCheckout,
            isRestored,
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
