import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { paymentMethodsService } from '../services/paymentMethods';
import { PaymentCardObject, PaymentUPIObject } from '../types/types';

// Re-export types used by payment-methods screen
export type PaymentCard = PaymentCardObject;
export type PaymentUPI = PaymentUPIObject;

interface PaymentContextType {
    cards: PaymentCardObject[];
    upis: PaymentUPIObject[];
    loading: boolean;
    addCard: (card: Omit<PaymentCardObject, 'id' | 'bankName' | 'iconName' | 'iconColor'>) => Promise<void>;
    updateCard: (id: string, updates: Partial<PaymentCardObject>) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    addUPI: (upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => Promise<void>;
    updateUPI: (id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => Promise<void>;
    deleteUPI: (id: string) => Promise<void>;
    getCard: (id: string) => PaymentCardObject | undefined;
    getUPI: (id: string) => PaymentUPIObject | undefined;
    reload: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<PaymentCardObject[]>([]);
    const [upis, setUpis] = useState<PaymentUPIObject[]>([]);
    const [loading, setLoading] = useState(false);

    const loadPaymentMethods = useCallback(async () => {
        setLoading(true);
        try {
            const methods = await paymentMethodsService.getAll();
            setCards(methods.filter(m => m.type === 'card').map(m => m as PaymentCardObject));
            setUpis(methods.filter(m => m.type === 'upi').map(m => m as PaymentUPIObject));
        } catch (error) {
            console.error('Error loading payment methods:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPaymentMethods();
    }, [loadPaymentMethods]);

    const addCard = async (card: Omit<PaymentCardObject, 'id' | 'bankName' | 'iconName' | 'iconColor'>) => {
        const newCard = await paymentMethodsService.addCard({
            cardNumber: card.cardNumber,
            cardHolderName: card.cardHolderName,
            expiryDate: card.expiryDate,
            cardType: card.cardType,
        });
        setCards(prev => [...prev, newCard as PaymentCardObject]);
    };

    const updateCard = async (id: string, updates: Partial<PaymentCardObject>) => {
        const updated = await paymentMethodsService.updateCard(id, {
            cardNumber: updates.cardNumber,
            cardHolderName: updates.cardHolderName,
            expiryDate: updates.expiryDate,
            cardType: updates.cardType,
        });
        setCards(prev => prev.map(c => c.id === id ? { ...c, ...updated } as PaymentCardObject : c));
    };

    const deleteCard = async (id: string) => {
        await paymentMethodsService.delete(id);
        setCards(prev => prev.filter(c => c.id !== id));
    };

    const addUPI = async (upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => {
        const newUPI = await paymentMethodsService.addUPI(upiId, upiApp);
        setUpis(prev => [...prev, newUPI as PaymentUPIObject]);
    };

    const updateUPI = async (id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => {
        const updated = await paymentMethodsService.updateUPI(id, upiId, upiApp);
        setUpis(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    };

    const deleteUPI = async (id: string) => {
        await paymentMethodsService.delete(id);
        setUpis(prev => prev.filter(u => u.id !== id));
    };

    const getCard = (id: string) => cards.find(c => c.id === id);
    const getUPI = (id: string) => upis.find(u => u.id === id);

    return (
        <PaymentContext.Provider value={{
            cards,
            upis,
            loading,
            addCard,
            updateCard,
            deleteCard,
            addUPI,
            updateUPI,
            deleteUPI,
            getCard,
            getUPI,
            reload: loadPaymentMethods,
        }}>
            {children}
        </PaymentContext.Provider>
    );
};

export const usePayment = () => {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error('usePayment must be used within a PaymentProvider');
    }
    return context;
};
