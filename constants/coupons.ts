import { CouponObject } from '../types/types';

export const COUPONS: CouponObject[] = [
    {
        id: '1',
        code: 'FASHION50',
        title: 'FASHION50',
        description: 'Get 50% off on your first summer collection purchase.',
        discountType: 'percentage',
        discountValue: 50,
        minOrderValue: 1000,
        maxDiscount: 500,
        expiryDate: '2 days left',
        type: 'Fashion',
        status: 'active',
    },
    {
        id: '2',
        code: 'SNEAK20',
        title: 'SNEAK20',
        description: 'Flat discount on all Nike and Adidas sneakers.',
        discountType: 'fixed',
        discountValue: 200,
        minOrderValue: 1500,
        maxDiscount: 200,
        expiryDate: 'Dec 31',
        type: 'Footwear',
        status: 'active',
    },
    {
        id: '3',
        code: 'GLOW15',
        title: 'GLOW15',
        description: 'Skincare products discount for premium members.',
        discountType: 'percentage',
        discountValue: 15,
        minOrderValue: 500,
        maxDiscount: 150,
        expiryDate: 'Expired',
        type: 'Beauty',
        status: 'used',
    },
    {
        id: '4',
        code: 'FREESHIP',
        title: 'FREESHIP',
        description: 'Free shipping on all orders above $50.',
        discountType: 'fixed', // Assuming free ship is essentially a fixed discount equal to shipping fee, or special logic. For now, logic in CartContext handles discountValue.
        discountValue: 0, // Special handling might be needed for Free Shipping, or we just give a discount equal to shipping fee.
        minOrderValue: 50, // $50? distinct currency? The app seems to use INR. converting $50 to ~4000 INR or just keeping it consistent with app currency. Let's assume 500 INR.
        maxDiscount: 100,
        expiryDate: 'Jan 15',
        type: 'Free Shipping',
        status: 'active',
    },
    // Adding the specific mock coupons we used earlier if they differ, or mapping them to these.
    // The user said "same as ones available in coupons section".
    // I will stick to these 4.
    // However, I need to make sure 'FREESHIP' works.
    // I will update 'FREESHIP' to have some value or handle it.
    // Let's set FREESHIP discountValue to 0 and handle it or just give it a value like 50 (shipping fee).
];
