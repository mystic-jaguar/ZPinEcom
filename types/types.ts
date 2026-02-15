/**
 * Centralized Type Definitions for ZPinEcom
 * Based on API Contract Specification
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * GeoJSON Point for location coordinates
 * Format: [longitude, latitude]
 */
export interface Coordinates {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationObject {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * Basic User Object (aggregated for client convenience)
 * From Users entity with fields from related entities
 */
export interface UserObject {
    id: string;                    // From Users entity
    name: string;                  // From Users entity
    mobile: string;                // From Users entity
    userName: string;              // From Users entity
    email: string;                 // From Users entity
    userRole: 'customer' | 'seller' | 'delivery';  // From Users entity
    isVerified: boolean;           // Derived from verification logic
    profileImage?: any;            // From User_Details entity (Cloudinary URL) or local require
    timeStamp: string;             // From Users entity (ISO 8601)
    isPro?: boolean;               // Pro member status
}

export interface UserDetailsObject {
    userId: string;
    dob?: string;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: Coordinates;
    preferences?: {
        receivePushNotifications: boolean;
        receiveEmailUpdates: boolean;
        receiveOrderUpdates: boolean;
    };
    createdAt?: string;
}

export interface CompleteUserProfile {
    user: UserObject;
    details?: UserDetailsObject;
    sellerDetails?: any; // Placeholder for now
    bankDetails?: any;   // Placeholder for now
}



// ============================================================================
// PRODUCT TYPES
// ============================================================================

/**
 * Seller Location (embedded in Product)
 */
export interface SellerLocation {
    city: string;
    state: string;
    pincode: string;
    coordinates: Coordinates;
}

/**
 * Product Object (Enhanced with Location)
 */
export interface ProductObject {
    productId: string;
    userId: string;                        // Seller ID
    productName: string;
    description: string;
    categoryId: string;
    deepestCategoryName: string;           // e.g., "SweatShirt"
    categoryPath: string;                  // e.g., "fashion-man-shirt-casual-solid"
    price: number;
    quantity: number;
    inStock: boolean;
    images: (string | any)[];              // Array of Cloudinary URLs or local require
    sellerLocation: SellerLocation;
    distance?: number;                     // Distance in km from user's location (only in search results)
    timeStamp: string;                     // ISO 8601

    // Additional fields from current implementation
    originalPrice?: number;
    rating?: number;
    discount?: number;
    subtitle?: string;
    colors?: string[];
    sizes?: string[];
    details?: string;
    isLightningFast?: boolean;
}

// ============================================================================
// ADDRESS TYPES
// ============================================================================

/**
 * Shipping Address Object
 */
export interface AddressObject {
    id: string;
    name: string;
    phone: string;
    address: string;                       // Combined or line 1
    addressLine1?: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string;
    label: 'Home' | 'Work' | 'Other';      // Type of address
    coordinates?: Coordinates;
    isDefault: boolean;
}

// ============================================================================
// CART TYPES
// ============================================================================

/**
 * Cart Item Object (from API GET /api/v1/cart response)
 */
export interface CartItemObject {
    cartItemId: string;
    productId: string;
    product: ProductObject;                // Full product object nested
    quantity: number;
    priceAtAdd: number;
    isAvailable: boolean;
    timeStamp: string;                     // ISO 8601

    // Additional fields from current implementation
    selectedColor?: string;
    selectedSize?: string;
}

/**
 * Cart Response Object (full cart with totals)
 */
export interface CartResponseObject {
    cart: CartItemObject[];
    totalItems: number;
    totalAmount: number;
    hasUnavailableItems: boolean;
    hasPriceChanges: boolean;
}

// ============================================================================
// COUPON TYPES
// ============================================================================

/**
 * Coupon Object
 */
export interface CouponObject {
    id: string;
    code: string;
    title: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderValue: number;
    maxDiscount?: number;
    expiryDate?: string; // ISO 8601 or display string
    type?: string;
    status?: 'active' | 'used' | 'expired';
}

// ============================================================================
// ORDER TYPES
// ============================================================================

/**
 * Order Item Object (product in order)
 */
export interface OrderItemObject {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;                         // Cloudinary URL
    variant?: string;
}

/**
 * Order Object (Complete - Used by Customer, Seller & Delivery Partner)
 */
export interface OrderObject {
    id: string;
    userId: string;
    sellerId: string;
    orderNumber: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    totalAmount: number;
    shippingAmount: number;
    taxAmount: number;
    finalAmount: number;
    shippingAddress: AddressObject;
    paymentMethod: 'razorpay' | 'cod' | 'wallet';
    paymentId?: string;
    deliveryBoyId?: string;
    deliveryStatus?: 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered';
    deliveryFee?: number;
    partnerEarning?: number;
    distance?: number;                     // km
    estimatedTime?: number;                // minutes
    otp?: string;
    items: OrderItemObject[];
    estimatedDelivery: string;             // ISO 8601
    trackingNumber?: string;
    notes?: string;
    createdAt: string;                     // ISO 8601
    updatedAt: string;                     // ISO 8601

    // Additional fields from current implementation
    subtotal?: number;
    savings?: number;
    isInstant?: boolean;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

/**
 * Payment Card Object
 */
export interface PaymentCardObject {
    id: string;
    cardNumber: string;                    // Last 4 digits or masked
    cardHolderName: string;
    expiryDate: string;                    // MM/YY format
    cvv?: string;                          // Only during add, not stored
    bankName: string;
    cardType: 'Credit Card' | 'Debit Card';
    iconName?: string;                     // For UI
    iconColor?: string;                    // For UI
}

/**
 * Payment UPI Object
 */
export interface PaymentUPIObject {
    id: string;
    upiId: string;
    label: string;                         // e.g., "Google Pay"
    subLabel: string;                      // e.g., "username@okaxis"
    upiApp: 'Google Pay' | 'PhonePe' | 'Paytm';
}

/**
 * Payment Object
 */
export interface PaymentObject {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    method: 'razorpay' | 'cod' | 'wallet';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    gatewayPaymentId?: string;
    gatewayOrderId?: string;
    createdAt: string;                     // ISO 8601
    updatedAt: string;                     // ISO 8601
}

// ============================================================================
// SELLER EARNINGS TYPES
// ============================================================================

/**
 * Seller Earnings Object
 */
export interface SellerEarningsObject {
    id: string;
    sellerId: string;
    orderId: string;
    orderNumber: string;
    grossAmount: number;
    platformFee: number;
    paymentGatewayFee: number;
    gstAmount: number;
    netAmount: number;
    status: 'pending' | 'processed' | 'paid';
    payoutDate?: string;                   // ISO 8601
    payoutId?: string;
    createdAt: string;                     // ISO 8601
    updatedAt: string;                     // ISO 8601
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Generic API Success Response
 */
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}

/**
 * Generic API Success Response with Pagination
 */
export interface ApiPaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: PaginationObject;
    message?: string;
}

/**
 * Generic API Error Response
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

/**
 * API Response Union Type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// LEGACY TYPES (for backward compatibility during refactoring)
// ============================================================================

/**
 * @deprecated Use ProductObject instead
 */
export interface Product extends Omit<ProductObject, 'productId' | 'userId' | 'productName'> {
    id: string;
    name: string;
    image: any;  // Can be require() or {uri: string}
    category: string;
    subCategory: string;
}
