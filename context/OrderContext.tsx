import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { CancelOrderData, orderService } from '../services/order';
import { AddressObject, OrderObject } from '../types/types';
import { useUser } from './UserContext';

interface OrderContextType {
    orders: OrderObject[];
    addOrder: (order: OrderObject) => void;
    getOrderById: (id: string) => OrderObject | undefined;
    cancelOrder: (id: string, data: CancelOrderData) => Promise<{ message: string; refundAmount: number; refundStatus: string }>;
    updateOrderStatus: (id: string, status: OrderObject['status']) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Mock initial data
const DUMMY_ADDRESS: AddressObject = {
    id: 'addr-1',
    name: 'John Doe',
    phone: '9876543210',
    address: '123 Main St',
    addressLine1: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    landmark: 'Near Park',
    label: 'Home',
    isDefault: true
};

const DUMMY_ORDERS: OrderObject[] = [
    {
        id: 'mock-1',
        userId: 'user-456',
        sellerId: 'seller-789',
        orderNumber: 'ZP-98231',
        status: 'delivered',
        paymentStatus: 'paid',
        totalAmount: 899,
        shippingAmount: 0,
        taxAmount: 0,
        finalAmount: 899,
        shippingAddress: DUMMY_ADDRESS,
        paymentMethod: 'razorpay',
        paymentId: 'pay_123',
        items: [{
            productId: '2',
            productName: 'School Backpack',
            image: 'https://example.com/backpack.jpg',
            price: 899,
            quantity: 1
        }],
        estimatedDelivery: '2024-10-26T00:00:00Z',
        createdAt: '2024-10-24T00:00:00Z',
        updatedAt: '2024-10-24T00:00:00Z',
        subtotal: 899,
        savings: 0,
        isInstant: false
    },
    {
        id: 'mock-2',
        userId: 'user-456',
        sellerId: 'seller-890',
        orderNumber: 'ZP-98232',
        status: 'processing',
        paymentStatus: 'paid',
        totalAmount: 598,
        shippingAmount: 40,
        taxAmount: 0,
        finalAmount: 638,
        shippingAddress: DUMMY_ADDRESS,
        paymentMethod: 'razorpay',
        paymentId: 'pay_456',
        items: [{
            productId: '7',
            productName: 'Hydrating Face Wash',
            image: 'https://example.com/facewash.jpg',
            price: 299,
            quantity: 2
        }],
        estimatedDelivery: '2024-10-28T00:00:00Z',
        createdAt: '2024-10-25T00:00:00Z',
        updatedAt: '2024-10-25T00:00:00Z',
        subtotal: 598,
        savings: 0,
        isInstant: true
    }
];

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const [orders, setOrders] = useState<OrderObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    useEffect(() => {
        if (!isUserLoading) {
            loadOrders();
        }
    }, [isAuthenticated, isUserLoading]);

    const loadOrders = async () => {
        try {
            if (isAuthenticated) {
                const token = await tokenManager.getAccessToken();
                if (token && token !== 'null' && token !== 'undefined') {
                    const response = await orderService.getOrders();
                    // API contract: { orders: [...], pagination: {} }
                    // Fallback: { data: [...] } or { success, data: [] }
                    const ordersData = (response as any).orders || (response as any).data || [];
                    if (ordersData && Array.isArray(ordersData)) {
                        setOrders(ordersData);
                    }
                }
            } else {
                // If not logged in, clear orders
                setOrders([]);
            }
        } catch (error: any) {
            console.error('Failed to load orders:', error);
            // If token is expired or invalid (401/500), clear stale token
            const status = error?.response?.status;
            if (status === 401 || status === 500) {
                await tokenManager.clearTokens?.();
            }
            setOrders([]); // Show empty on error
        } finally {
            setIsLoading(false);
        }
    };

    const addOrder = (order: OrderObject) => {
        setOrders(prev => [order, ...prev]);
        // Note: Creating an order is usually done via checkout flow directly calling service
        // This method updates the local state to reflect the new order immediately
    };

    const getOrderById = (id: string) => {
        return orders.find(o => o.orderNumber === id || o.id === id);
    };

    const cancelOrder = async (id: string, data: CancelOrderData) => {
        try {
            // Optimistic update
            setOrders(prev => prev.map(order =>
                order.id === id
                    ? { ...order, status: 'cancelled' as const }
                    : order
            ));

            // Sync with backend
            const response = await orderService.cancelOrder(id, data);

            if (!response.data) {
                throw new Error('Invalid response from cancel order service');
            }

            // Update with actual refund status from backend
            setOrders(prev => prev.map(order =>
                order.id === id
                    ? { ...order, paymentStatus: response.data.refundStatus as OrderObject['paymentStatus'] }
                    : order
            ));

            return response.data;
        } catch (error) {
            console.error('Failed to cancel order:', error);
            // Revert optimistic update if needed or show error
            loadOrders(); // Reload to get true state
            throw error; // Re-throw to let UI handle it
        }
    };

    const updateOrderStatus = (id: string, status: OrderObject['status']) => {
        setOrders(prev => prev.map(order =>
            order.id === id ? { ...order, status, updatedAt: new Date().toISOString() } : order
        ));
    };

    return (
        <OrderContext.Provider value={{
            orders,
            addOrder,
            getOrderById,
            cancelOrder,
            updateOrderStatus
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
