import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { PaymentCardObject, PaymentUPIObject } from '../types/types';

const PAYMENT_CARDS_STORAGE_KEY = '@ZPinEcom:paymentCards';
const PAYMENT_UPIS_STORAGE_KEY = '@ZPinEcom:paymentUPIs';

interface PaymentContextType {
    cards: PaymentCardObject[];
    upis: PaymentUPIObject[];
    addCard: (card: Omit<PaymentCardObject, 'id' | 'bankName' | 'iconName' | 'iconColor'>) => void;
    updateCard: (id: string, updates: Partial<PaymentCardObject>) => void;
    deleteCard: (id: string) => void;
    addUPI: (upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => void;
    updateUPI: (id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => void;
    deleteUPI: (id: string) => void;
    getCard: (id: string) => PaymentCardObject | undefined;
    getUPI: (id: string) => PaymentUPIObject | undefined;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
    // Initial Mock Data
    const [cards, setCards] = useState<PaymentCardObject[]>([
        {
            id: '1',
            cardNumber: '1234567812341234',
            cardHolderName: 'Jay Warale',
            expiryDate: '09/28',
            cvv: '123',
            bankName: 'HDFC Bank',
            cardType: 'Credit Card',
            iconName: 'business',
            iconColor: '#1565C0'
        },
        {
            id: '2',
            cardNumber: '8765432187655678',
            cardHolderName: 'Jay Warale',
            expiryDate: '12/26',
            cvv: '456',
            bankName: 'ICICI Bank',
            cardType: 'Debit Card',
            iconName: 'home',
            iconColor: '#E65100'
        }
    ]);

    const [upis, setUpis] = useState<PaymentUPIObject[]>([
        {
            id: '1',
            upiId: 'jaywarale@okaxis',
            label: 'Google Pay',
            subLabel: 'jaywarale@okaxis',
            upiApp: 'Google Pay'
        }
    ]);

    // Load payment methods from AsyncStorage
    // API: GET /api/v1/users/payment-methods
    useEffect(() => {
        loadPaymentMethods();
    }, []);

    const loadPaymentMethods = async () => {
        try {
            const [cardsData, upisData] = await Promise.all([
                AsyncStorage.getItem(PAYMENT_CARDS_STORAGE_KEY),
                AsyncStorage.getItem(PAYMENT_UPIS_STORAGE_KEY)
            ]);

            if (cardsData) setCards(JSON.parse(cardsData));
            if (upisData) setUpis(JSON.parse(upisData));
        } catch (error) {
            console.error('Error loading payment methods:', error);
        }
    };

    const addCard = (card: Omit<PaymentCardObject, 'id' | 'bankName' | 'iconName' | 'iconColor'>) => {
        const newCard: PaymentCardObject = {
            id: Math.random().toString(36).substr(2, 9),
            ...card,
            bankName: 'HDFC Bank', // Mock logic for bank name
            iconName: 'card', // Default icon
            iconColor: '#4CAF50'
        };
        const newCards = [...cards, newCard];
        setCards(newCards);
        AsyncStorage.setItem(PAYMENT_CARDS_STORAGE_KEY, JSON.stringify(newCards));
        // API: POST /api/v1/users/payment-methods
    };

    const updateCard = (id: string, updates: Partial<PaymentCardObject>) => {
        const updatedCards = cards.map(c => c.id === id ? { ...c, ...updates } : c);
        setCards(updatedCards);
        AsyncStorage.setItem(PAYMENT_CARDS_STORAGE_KEY, JSON.stringify(updatedCards));
    };

    const deleteCard = (id: string) => {
        const filteredCards = cards.filter(c => c.id !== id);
        setCards(filteredCards);
        AsyncStorage.setItem(PAYMENT_CARDS_STORAGE_KEY, JSON.stringify(filteredCards));
    };

    const addUPI = (upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => {
        const newUPI: PaymentUPIObject = {
            id: Math.random().toString(36).substr(2, 9),
            upiId,
            label: upiApp,
            subLabel: upiId,
            upiApp: upiApp
        };
        const newUpis = [...upis, newUPI];
        setUpis(newUpis);
        AsyncStorage.setItem(PAYMENT_UPIS_STORAGE_KEY, JSON.stringify(newUpis));
        // API: POST /api/v1/users/payment-methods
    };

    const updateUPI = (id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => {
        const updatedUpis = upis.map(u => u.id === id ? { ...u, upiId, label: upiApp, subLabel: upiId, upiApp: upiApp } : u);
        setUpis(updatedUpis);
        AsyncStorage.setItem(PAYMENT_UPIS_STORAGE_KEY, JSON.stringify(updatedUpis));
    };

    const deleteUPI = (id: string) => {
        const filteredUpis = upis.filter(u => u.id !== id);
        setUpis(filteredUpis);
        AsyncStorage.setItem(PAYMENT_UPIS_STORAGE_KEY, JSON.stringify(filteredUpis));
    };

    const getCard = (id: string) => cards.find(c => c.id === id);
    const getUPI = (id: string) => upis.find(u => u.id === id);


    return (
        <PaymentContext.Provider value={{
            cards,
            upis,
            addCard,
            updateCard,
            deleteCard,
            addUPI,
            updateUPI,
            deleteUPI,
            getCard,
            getUPI
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
