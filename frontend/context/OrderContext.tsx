import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { CancelOrderData, orderService } from '../services/order';
import { OrderObject } from '../types/types';
import { useUser } from './UserContext';

interface OrderContextType {
    orders: OrderObject[];
    totalOrders: number;
    addOrder: (order: OrderObject) => void;
    getOrderById: (id: string) => OrderObject | undefined;
    cancelOrder: (id: string, data: CancelOrderData) => Promise<{ message: string; refundAmount: number; refundStatus: string }>;
    updateOrderStatus: (id: string, status: OrderObject['status']) => void;
    isLoading: boolean;
    refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const [orders, setOrders] = useState<OrderObject[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    const loadOrders = useCallback(async () => {
        if (!isAuthenticated) {
            setOrders([]);
            setTotalOrders(0);
            setIsLoading(false);
            return;
        }
        try {
            const token = await tokenManager.getAccessToken();
            if (!token || token === 'null' || token === 'undefined') {
                setIsLoading(false);
                return;
            }
            const response = await orderService.getOrders();
            // Backend: { success, data: [...], pagination: {} }
            const raw = (response as any).data || (response as any).orders || [];
            if (Array.isArray(raw)) {
                const normalized: OrderObject[] = raw.map((o: any) => ({
                    id: o.id,
                    userId: o.userId,
                    sellerId: o.sellerId || '',
                    orderNumber: o.orderNumber,
                    groupId: o.groupId ?? null,
                    status: o.status,
                    // Set only when a seller rejected the order. This normalizer is an
                    // allow-list, so a field missing here is dropped no matter what the
                    // backend sends — that is why the list card showed no reason note.
                    cancellationReason: o.cancellationReason ?? null,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                    shippingAmount: Number(o.shippingAmount || 0),
                    taxAmount: Number(o.taxAmount || 0),
                    finalAmount: Number(o.finalAmount || 0),
                    shippingAddress: o.shippingAddress || {},
                    paymentMethod: o.paymentMethod || 'cod',
                    paymentId: o.paymentId,
                    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
                        orderItemId: item.orderItemId || item.id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        price: Number(item.price || 0),
                        image: item.image || '',
                        variant: item.variant,
                        isReturned: Boolean(item.isReturned),
                        returnedQuantity: Number(item.returnedQuantity || 0),
                    })) : [],
                    estimatedDelivery: o.estimatedDelivery || '',
                    trackingNumber: o.trackingNumber,
                    notes: o.notes,
                    createdAt: o.createdAt,
                    updatedAt: o.updatedAt,
                    date: o.createdAt,
                }));
                // Backend already excludes abandoned/unpaid online checkouts; plain COD
                // orders are legitimately pending/pending until the seller confirms them
                // and must not be filtered out again here.
                setOrders(normalized);
                const total = (response as any).pagination?.totalItems;
                setTotalOrders(typeof total === 'number' ? total : normalized.length);
            }
        } catch (error: any) {
            // Keep whatever we already have — a transient network/500 must not
            // blank the order list (and the profile "ORDERS" count) out to 0.
            console.error('Failed to load orders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isUserLoading) {
            loadOrders();
        }
    }, [isUserLoading, loadOrders]);

    const addOrder = (order: OrderObject) => {
        const safe: OrderObject = {
            ...order,
            items: Array.isArray(order.items) ? order.items : [],
            status: order.status || 'pending',
            paymentStatus: order.paymentStatus || 'pending',
            totalAmount: Number(order.totalAmount || 0),
            finalAmount: Number(order.finalAmount || 0),
            shippingAmount: Number(order.shippingAmount || 0),
            taxAmount: Number(order.taxAmount || 0),
        };
        setOrders(prev => [safe, ...prev]);
    };

    const getOrderById = (id: string) => {
        return orders.find(o => o.orderNumber === id || o.id === id);
    };

    const cancelOrder = async (id: string, data: CancelOrderData) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o));
        try {
            const response = await orderService.cancelOrder(id, data);
            if (!response.data) throw new Error('Invalid response');
            setOrders(prev => prev.map(o =>
                o.id === id ? { ...o, paymentStatus: response.data.refundStatus as OrderObject['paymentStatus'] } : o
            ));
            return response.data;
        } catch (error) {
            await loadOrders();
            throw error;
        }
    };

    const updateOrderStatus = (id: string, status: OrderObject['status']) => {
        setOrders(prev => prev.map(o =>
            o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
        ));
    };

    return (
        <OrderContext.Provider value={{
            orders,
            totalOrders,
            addOrder,
            getOrderById,
            cancelOrder,
            updateOrderStatus,
            isLoading,
            refreshOrders: loadOrders,
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
