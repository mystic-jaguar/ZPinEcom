import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Address } from './AddressContext';

export interface OrderItem {
    id: string; // Product ID
    name: string;
    image: any;
    price: number;
    quantity: number;
    variant?: string;
    cartId?: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    date: string;
    status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Unpacked';
    items: OrderItem[];
    total: number;
    address: Address;
    paymentMethod: string;
    estimatedDelivery: string;
    deliveryFee: number;
    taxes: number;
    subtotal: number;
    savings: number;
    isInstant: boolean;
}

interface OrderContextType {
    orders: Order[];
    addOrder: (order: Order) => void;
    getOrderById: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Mock initial data if needed, or empty
const DUMMY_ORDERS: Order[] = [];

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const [orders, setOrders] = useState<Order[]>(DUMMY_ORDERS);

    const addOrder = (order: Order) => {
        setOrders(prev => [order, ...prev]);
    };

    const getOrderById = (id: string) => {
        return orders.find(o => o.orderNumber === id || o.id === id);
    };

    return (
        <OrderContext.Provider value={{
            orders,
            addOrder,
            getOrderById
        }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrder must be used within an OrderProvider');
    }
    return context;
};
