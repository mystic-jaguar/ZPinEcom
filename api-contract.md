*****always keep in mind that while designing the api contract think that what data/field the client need for the UI if that field is not into that particular entity or it is in related entity but you just add those field in the object*****

Base URL (for render deployed):- "https://zpin-ecommerce-backend-997x.onrender.com/api/v1/"

▣ OBJECT DEFINITIONS:
======================================================================================

    • User Object (Basic - aggregated for client convenience)
        {
        "id": "user_123",                    // From Users entity
        "name": "Rahul Sharma",               // From Users entity
        "mobile": "9876543210",               // From Users entity
        "userName": "abx122",                 // From Users entity
        "email": "rahul@example.com",         // From Users entity
        "userRole": "customer",               // From Users entity
        "isVerified": true,                   // Derived from verification logic
        "profileImage": "https://cloudinary.com/image_url", // From User_Details entity
        "timeStamp": "2025-11-29T10:00:00Z"   // From Users entity
        }

    • Complete User Profile (Aggregated from all collections)
        {
        "user": {<user_object>},
        "details": {<user_details_object_with_coordinates>},
        "sellerDetails": {<seller_details_object>}, // if seller
        "bankDetails": {<bank_details_object>} // if seller
        }

    • User Details Object (Enhanced with Location)
        {
        "_id": "userdetail_123",
        "userId": "user_456",
        "dob": "1990-05-15",
        "address": "Shop 15, Linking Road, Bandra West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400050",
        "coordinates": {
            "type": "Point",
            "coordinates": [72.8294, 19.0544] // [longitude, latitude]
        },
        "gender": "male",
        "profileImage": "https://cloudinary.com/image_url",
        "createdAt": "2025-11-29T10:00:00Z"
        }

    • Product Object (Enhanced with Location)
        {
        "productId": "product_123",
        "userId": "user_456",
        "productName": "Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "categoryId": "category_789",
        "deepestCategoryName": "SweatShirt",
        "categoryPath": "fashion-man-shirt-casual-solid",
        "price": 2999.99,
        "quantity": 50,
        "inStock": true,
        "images": ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"],
        "sellerLocation": {
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400050",
            "coordinates": {
                "type": "Point",
                "coordinates": [72.8294, 19.0544] // [longitude, latitude]
            }
        },
        "distance": 2.5, // Distance in km from user's location (only in search results)
        "timeStamp": "2025-11-29T10:00:00Z"
        }

    • Order Object (Complete - Used by Customer, Seller & Delivery Partner)
        {
        "id": "order_123",
        "userId": "user_456",
        "sellerId": "seller_789",
        "orderNumber": "ORD-2025-001234",
        "status": "pending", // pending, confirmed, processing, shipped, delivered, cancelled, returned
        "paymentStatus": "paid", // pending, paid, failed, refunded
        "totalAmount": 7499.97,
        "shippingAmount": 99.00,
        "taxAmount": 674.99,
        "finalAmount": 7273.96,
        "shippingAddress": {
            "name": "John Doe",
            "phone": "9876543210",
            "address": "123 Main St",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "landmark": "Near Metro Station",
            "coordinates": {
                "type": "Point",
                "coordinates": [72.8777, 19.0760]
            }
        },
        "paymentMethod": "razorpay", // razorpay, cod, wallet
        "paymentId": "pay_razorpay_123",
        "deliveryBoyId": "delivery_boy_101",
        "deliveryStatus": "assigned", // assigned, accepted, picked_up, in_transit, delivered
        "deliveryFee": 50.00,
        "partnerEarning": 35.00,
        "distance": 5.2,
        "estimatedTime": 25,
        "otp": "1234",
        "items": [
            {
                "productId": "product_123",
                "productName": "Wireless Headphones",
                "quantity": 2,
                "price": 2999.99,
                "image": "https://cloudinary.com/product1.jpg"
            }
        ],
        "estimatedDelivery": "2025-12-05T18:00:00Z",
        "trackingNumber": "TRK123456789",
        "notes": "Handle with care",
        "createdAt": "2025-11-29T10:00:00Z",
        "updatedAt": "2025-11-29T10:00:00Z"
        }

    • Seller Earnings Object
        {
        "id": "earning_123",
        "sellerId": "seller_456",
        "orderId": "order_789",
        "orderNumber": "ORD-2025-001234",
        "grossAmount": 2999.99,
        "platformFee": 149.99,
        "paymentGatewayFee": 59.99,
        "gstAmount": 449.99,
        "netAmount": 2340.02,
        "status": "pending", // pending, processed, paid
        "payoutDate": null,
        "payoutId": "payout_123",
        "createdAt": "2025-11-29T10:00:00Z",
        "updatedAt": "2025-11-29T10:00:00Z"
        }

    • Pagination Object
        {
        "currentPage": 1,
        "totalPages": 10,
        "totalItems": 95,
        "itemsPerPage": 10,
        "hasNextPage": true,
        "hasPrevPage": false
        }

▣ USER MANAGEMENT:
======================================================================================

1. GET :- /api/v1/users
--------------------------------------------------------------------------------------
Returns all users with joined data from both Credential and UserDetail collections with pagination.
• URL Params
    Optional: page=[number], limit=[number]
• Data Params
    None
• Headers
    None
• Success Response:
    • Code: 200
    • Content: {
        success: true,
        data: [{<user_object>}],
        pagination: {<pagination_object>}
    }

2. GET :- /api/v1/users/:id
--------------------------------------------------------------------------------------
Returns specific user with joined data from both Credential and UserDetail collections.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    None
• Success Response:
    • Code: 200
    • Content: { success: true, data: {<user_object>} }

3. GET :- /api/v1/users/orders
--------------------------------------------------------------------------------------
Returns all Orders associated with the authenticated user with pagination.
• URL Params
    Optional: page=[number], limit=[number]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { orders: [{<order_object>}], pagination: {<pagination_object>} }

▣ AUTHENTICATION:
======================================================================================

4. POST :- /api/v1/auth/signup
--------------------------------------------------------------------------------------
Creates a new User and returns the new object.
• URL Params
    None
• Data Params
    {
        userName: string,
        mobile: string,
        userRole: string,
        password: string,
        email: string,
        name: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { <user_object> }

5. POST :- /api/v1/auth/login
--------------------------------------------------------------------------------------
Authenticates a user and returns an OAuth token.
• URL Params
    None
• Data Params
    {
        email: string, // access from user any of them email or username but with the field name as email
        password: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { success: true, message: "Logged in successfully" }

6. POST :- /api/v1/auth/logout
--------------------------------------------------------------------------------------
Logs out the authenticated user and invalidates their session/token.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Logged out successfully" }

7. POST :- /api/v1/auth/verification/sendOTP
--------------------------------------------------------------------------------------
Sends an OTP to the user's registered mobile number for verification.
• URL Params
    None
• Data Params
    { mobile: string } //10digit number allow
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { message: "OTP sent successfully" }

8. POST :- /api/v1/auth/verification/verifyOTP
--------------------------------------------------------------------------------------
Verifies the OTP sent to the user's mobile number for regular verification.
• URL Params
    None
• Data Params
    {
        mobile: string, //10digit number allow
        otp: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { message: "OTP verified successfully" }

9. POST :- /api/v1/auth/forgetPassword/sendOTP
--------------------------------------------------------------------------------------
Sends OTP to user's registered mobile number for password reset.
• URL Params
    None
• Data Params
    {
        mobile: string, //10digit number
        email: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { message: "OTP sent successfully" }

10. POST :- /api/v1/auth/forgetPassword/verifyOTP
--------------------------------------------------------------------------------------
Verifies OTP for password reset and returns JWT reset token.
• URL Params
    None
• Data Params
    {
        mobile: string,
        email: string,
        otp: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { message: "OTP verified successfully", resetToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }

11. POST :- /api/v1/auth/forgetPassword/resetPassword
--------------------------------------------------------------------------------------
Resets password using JWT reset token.
• URL Params
    None
• Data Params
    {
        resetToken: string, // JWT token from step 10
        newPassword: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { message: "Password reset successfully", user: {<user_object>} }

12. POST :- /api/v1/users/refresh-token
--------------------------------------------------------------------------------------
Refreshes expired JWT tokens.
• URL Params
    None
• Data Params
    { refreshToken: string }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { accessToken: "new_jwt_token", refreshToken: "new_refresh_token" }

▣ USER PROFILE MANAGEMENT:
======================================================================================

13. POST :- /api/v1/users/customer/profile
--------------------------------------------------------------------------------------
Adds customer personal profile details with profile image upload.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        dob: string,
        gender: string,
        preferences: {
            notifications: boolean,
            theme: string,
            language: string
        },
        accountType: string,
        profileImage: File // optional image file
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "Customer profile created successfully", data: {<customer_profile_object>} }



19. POST :- /api/v1/users/shipping-address
--------------------------------------------------------------------------------------
Adds customer shipping address.
• URL Params
    None
• Data Params
    {
        name: string,
        phone: string,
        addressLine1: string,
        addressLine2: string,
        city: string,
        state: string,
        pincode: string,
        country: string,
        landmark: string,
        label: string,
        coordinates: [number, number],
        isDefault: boolean
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "User details saved successfully", data: {<userDetail_object_with_coordinates>} }

14. PUT :- /api/v1/users/profileDetails
--------------------------------------------------------------------------------------
Updates user profile details with optional new profile image upload.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        userName: string (optional),
        name: string (optional),
        dob: string,
        address: string,
        city: string,
        state: string,
        pincode: string,
        gender: string,
        profileImage: File (optional) // new image file to upload
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { success: true, message: "Profile updated successfully" }





▣ LOCATION SERVICES:
======================================================================================

33. POST :- /api/v1/public/location/coordinates
--------------------------------------------------------------------------------------
**DEVELOPMENT ONLY** - Converts user's pincode/city to coordinates when Google Maps API key is not available.
• URL Params
    None
• Data Params
    {
        pincode: string, // optional
        city: string,    // optional (either pincode or city required)
        state: string    // optional
    }
• Headers
    Content-Type: application/json
    **No Authorization Required** (Public endpoint)
• Success Response:
    • Code: 200
    • Content: { success: true, coordinates: [72.8777, 19.0760], location: { city: "Mumbai", state: "Maharashtra", pincode: "400001" } }

▣ PRODUCT MANAGEMENT:
======================================================================================

34. GET :- /api/v1/products
--------------------------------------------------------------------------------------
Returns all products with location-based filtering and pagination.
• URL Params
    Optional:
    - page=[number] (default: 1)
    - limit=[number] (default: 10)
    - lat=[number] (user latitude for 25km radius search)
    - lng=[number] (user longitude for 25km radius search)
    - city=[string] (fallback location filter)
    - state=[string] (fallback location filter)
    - pincode=[string] (fallback location filter)
• Data Params
    None
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { products: [{<product_object_with_distance>}], pagination: {<pagination_object>}, locationInfo: {<location_info>} }

22. GET :- /api/v1/products/:id
--------------------------------------------------------------------------------------
Returns the specified product with full details.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { <product_object> }

23. POST :- /api/v1/products/addProduct
--------------------------------------------------------------------------------------
Creates a new product with images (seller only). Uses multipart/form-data for file uploads.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        "productName": "string",
        "description": "string",
        "categoryId": "string", // ID of the deepest/leaf category
        "deepestCategoryName": "string", // Name of the deepest category
        "categoryPath": "string", // JSON stringified array: [{id, name}, {id, name}]
        "price": "number",
        "quantity": "number", // inventory quantity
        "images": [File, File, File] // multiple image files
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product added successfully" }

24. PUT :- /api/v1/products/:id
--------------------------------------------------------------------------------------
Updates the specified product (seller only - own products).
• URL Params
    Required: id=[string]
• Data Params
    {
        "productName": "string",
        "description": "string",
        "categoryId": "string",
        "deepestCategoryName": "string",
        "categoryPath": "string",
        "price": "number",
        "inStock": "boolean",
        "productImageId": ["string"]
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { <product_object> }

25. DELETE :- /api/v1/products/:id
--------------------------------------------------------------------------------------
Deletes the specified product (seller only - own products).
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product deleted successfully" }

26. GET :- /api/v1/products/seller/:userId
--------------------------------------------------------------------------------------
Returns all products for a specific seller with pagination.
• URL Params
    Required: userId=[string] // User ID where role='seller'
    Optional: page=[number], limit=[number]
• Data Params
    None
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { products: [{<product_object>}], pagination: {<pagination_object>} }

27. GET :- /api/v1/products/category/:categoryId
--------------------------------------------------------------------------------------
Returns all products in a specific category with location-based filtering and pagination.
• URL Params
    Required: categoryId=[string]
    Optional: page=[number], limit=[number], lat=[number], lng=[number], city=[string], state=[string], pincode=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { products: [{<product_object_with_distance>}], pagination: {<pagination_object>}, categoryInfo: {<category_info>}, locationInfo: {<location_info>} }





▣ PRODUCT REVIEWS:
======================================================================================

32. GET :- /api/v1/products/:id/reviews
--------------------------------------------------------------------------------------
Returns all reviews for a product with pagination.
• URL Params
    Required: id=[string]
    Optional: page=[number], limit=[number]
• Data Params
    None
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { reviews: [{<review_object>}], pagination: {<pagination_object>} }

33. POST :- /api/v1/products/:id/reviews
--------------------------------------------------------------------------------------
Adds a review for a product (authenticated users only).
• URL Params
    Required: id=[string]
• Data Params
    {
        "rating": "number", // 1-5
        "comment": "string",
        "images": ["string"] // optional
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { message: "Review added successfully" }

▣ WISHLIST MANAGEMENT:
======================================================================================

34. GET :- /api/v1/wishlist
--------------------------------------------------------------------------------------
Returns user's wishlist with pagination.
• URL Params
    Optional: page=[number], limit=[number]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { wishlist: [{<product_object>}], pagination: {<pagination_object>} }

35. GET :- /api/v1/wishlist/count
--------------------------------------------------------------------------------------
Returns the count of items in user's wishlist.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { "count": 5 }

36. POST :- /api/v1/wishlist
--------------------------------------------------------------------------------------
Adds product to wishlist.
• URL Params
    None
• Data Params
    { "productId": "string" }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product added to wishlist" }

37. DELETE :- /api/v1/wishlist/:productId
--------------------------------------------------------------------------------------
Removes product from wishlist.
• URL Params
    Required: productId=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product removed from wishlist" }

38. DELETE :- /api/v1/wishlist/clear
--------------------------------------------------------------------------------------
Clears entire wishlist.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Wishlist cleared successfully" }

▣ CART MANAGEMENT:
======================================================================================

39. GET :- /api/v1/cart
--------------------------------------------------------------------------------------
Returns user's cart items.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "cart": [
            {
                "cartItemId": "cartitem_123",
                "productId": "product_123",
                "product": {<product_object>},
                "quantity": 2,
                "priceAtAdd": 2999.99,
                "isAvailable": true,
                "timeStamp": "2025-11-29T10:00:00Z"
            }
        ],
        "totalItems": 3,
        "totalAmount": 7499.97,
        "hasUnavailableItems": false,
        "hasPriceChanges": true
    }

40. POST :- /api/v1/cart
--------------------------------------------------------------------------------------
Adds product to cart.
• URL Params
    None
• Data Params
    {
        "productId": "string",
        "quantity": "number"
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product added to cart" }

41. PUT :- /api/v1/cart/:productId
--------------------------------------------------------------------------------------
Updates quantity of product in cart.
• URL Params
    Required: productId=[string]
• Data Params
    { "quantity": "number" }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Cart updated successfully" }

42. DELETE :- /api/v1/cart/:productId
--------------------------------------------------------------------------------------
Removes product from cart.
• URL Params
    Required: productId=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product removed from cart" }

43. DELETE :- /api/v1/cart
--------------------------------------------------------------------------------------
Clears entire cart.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Cart cleared successfully" }

44. GET :- /api/v1/cart/count
--------------------------------------------------------------------------------------
Returns the count of items in user's cart.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { "count": 3 }

▣ ORDER MANAGEMENT:
======================================================================================

45. POST :- /api/v1/orders
--------------------------------------------------------------------------------------
Creates a new order from cart items.
• URL Params
    None
• Data Params
    {
        "cartItems": ["cartitem_123", "cartitem_456"], // array of cart item IDs
        "shippingAddressId": "address_789", // or full address object
        "paymentMethod": "razorpay", // razorpay, cod
        "notes": "Handle with care", // optional
        "couponCode": "SAVE20" // optional
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: {
        "order": {<order_object>},
        "orderItems": [{<orderitem_object>}],
        "paymentDetails": {
            "paymentId": "pay_razorpay_123",
            "amount": 7273.96,
            "currency": "INR",
            "status": "created"
        }
    }

46. GET :- /api/v1/orders
--------------------------------------------------------------------------------------
Returns user's orders with pagination.
• URL Params
    Optional:
    - page=[number] (default: 1)
    - limit=[number] (default: 10)
    - status=[string] (pending, confirmed, delivered, etc.)
    - dateFrom=[string] (YYYY-MM-DD)
    - dateTo=[string] (YYYY-MM-DD)
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { orders: [{<order_object>}], pagination: {<pagination_object>} }

47. GET :- /api/v1/orders/:id
--------------------------------------------------------------------------------------
Returns specific order with full details.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "order": {<order_object>},
        "orderItems": [{<orderitem_object>}],
        "statusHistory": [
            {
                "status": "confirmed",
                "timestamp": "2025-11-29T10:00:00Z",
                "note": "Order confirmed by seller"
            }
        ]
    }

48. PUT :- /api/v1/orders/:id/cancel
--------------------------------------------------------------------------------------
Cancels an order (customer only - if cancellable).
• URL Params
    Required: id=[string]
• Data Params
    {
        "reason": "Changed mind", // cancellation reason
        "refundMethod": "original" // original, wallet
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        message: "Order cancelled successfully",
        "refundAmount": 7273.96,
        "refundStatus": "processing"
    }

49. GET :- /api/v1/orders/:id/track
--------------------------------------------------------------------------------------
Returns order tracking information.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "trackingNumber": "TRK123456789",
        "currentStatus": "shipped",
        "estimatedDelivery": "2025-12-05T18:00:00Z",
        "trackingHistory": [
            {
                "status": "Order Confirmed",
                "location": "Mumbai Warehouse",
                "timestamp": "2025-11-29T10:00:00Z"
            }
        ]
    }

50. POST :- /api/v1/orders/:id/return
--------------------------------------------------------------------------------------
Initiates return request for delivered orders.
• URL Params
    Required: id=[string]
• Data Params
    {
        "orderItemIds": ["orderitem_123", "orderitem_456"], // items to return
        "reason": "Defective product",
        "description": "Product not working as expected",
        "images": ["https://cloudinary.com/return1.jpg"] // optional
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: {
        "returnId": "return_123",
        "status": "requested",
        "message": "Return request submitted successfully"
    }

51. GET :- /api/v1/orders/:id/invoice
--------------------------------------------------------------------------------------
Downloads order invoice (PDF).
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: PDF file download



▣ PAYMENT INTEGRATION:
======================================================================================

59. POST :- /api/v1/payments/create
--------------------------------------------------------------------------------------
Creates payment intent for order.
• URL Params
    None
• Data Params
    {
        "orderId": "order_123",
        "amount": 7273.96,
        "currency": "INR",
        "method": "razorpay" // razorpay, cod, wallet
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: {
        "payment": {<payment_object>},
        "gatewayData": {
            "key": "rzp_test_key",
            "orderId": "order_razorpay_456",
            "amount": 727396, // amount in paise
            "currency": "INR",
            "name": "Zpin Store",
            "description": "Payment for Order #ORD-2025-001234"
        }
    }

60. POST :- /api/v1/orders/:id/payment/verify
--------------------------------------------------------------------------------------
Verifies payment after successful payment gateway response.
• URL Params
    Required: id=[string]
• Data Params
    {
        "paymentId": "pay_razorpay_123",
        "signature": "signature_from_razorpay",
        "orderId": "order_razorpay_456"
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        message: "Payment verified successfully",
        "paymentStatus": "paid",
        "order": {<order_object>}
    }

61. POST :- /api/v1/orders/:id/payment/retry
--------------------------------------------------------------------------------------
Retries payment for failed orders.
• URL Params
    Required: id=[string]
• Data Params
    { "paymentMethod": "razorpay" }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "paymentDetails": {
            "paymentId": "pay_razorpay_new_123",
            "amount": 7273.96,
            "currency": "INR"
        }
    }

62. GET :- /api/v1/payments/:id
--------------------------------------------------------------------------------------
Returns payment details.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { payment: {<payment_object>}, order: {<order_object>} }

63. POST :- /api/v1/payments/:id/refund
--------------------------------------------------------------------------------------
Processes payment refund.
• URL Params
    Required: id=[string]
• Data Params
    {
        "amount": 2000.00, // optional, defaults to full amount
        "reason": "Order cancelled by customer"
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "refund": {
            "id": "refund_123",
            "paymentId": "payment_456",
            "amount": 2000.00,
            "status": "processing",
            "gatewayRefundId": "rfnd_razorpay_789",
            "reason": "Order cancelled by customer",
            "createdAt": "2025-11-29T15:00:00Z"
        }
    }

64. POST :- /api/v1/payments/cod/confirm
--------------------------------------------------------------------------------------
Confirms Cash on Delivery payment.
• URL Params
    None
• Data Params
    {
        "orderId": "order_123",
        "collectedAmount": 7273.96,
        "deliveryPersonId": "delivery_456"
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { payment: {<payment_object>}, order: {<order_object>} }

65. POST :- /api/v1/payments/razorpay/webhook
--------------------------------------------------------------------------------------
Handles Razorpay webhook notifications.
• URL Params
    None
• Data Params
    Razorpay webhook payload
• Headers
    Content-Type: application/json
    X-Razorpay-Signature: <webhook_signature>
• Success Response:
    • Code: 200
    • Content: { message: "Webhook processed successfully" }





▣ IMPORTANT NOTES:
======================================================================================

• ROLE-BASED DATA FILTERING:
  - Customer APIs: Hide deliveryBoyId, partnerEarning, otp
  - Seller APIs: Hide customer payment details, otp
  - Delivery Partner APIs: Hide paymentMethod, paymentId, sensitive amounts

• AUTHENTICATION:
  - All authenticated endpoints require Authorization: Bearer <token> header
  - JWT tokens expire in 24 hours
  - Separate token systems for customers, sellers, and delivery partners

• DATA FORMATS:
  - All timestamps in ISO 8601 format (UTC)
  - Location coordinates in [longitude, latitude] format
  - All monetary amounts in INR (Indian Rupees)
  - Phone numbers are 10-digit Indian mobile numbers

• FILE UPLOADS:
  - Use multipart/form-data content type
  - Images stored on Cloudinary
  - Maximum file size: 5MB per image

• ERROR RESPONSE FORMAT:
    {
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE", // optional
    "details": {} // optional additional details
    }