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

14. POST :- /api/v1/users/seller/profile
--------------------------------------------------------------------------------------
Adds seller personal profile details with profile image upload.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        dob: string,
        gender: string,
        personalAddress: string,
        emergencyContact: {
            name: string,
            mobile: string
        },
        personalPanNo: string,
        preferences: {
            notifications: boolean,
            theme: string,
            language: string
        },
        profileImage: File // optional image file
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "Seller profile created successfully", data: {<seller_profile_object>} }

15. POST :- /api/v1/users/seller/business-details
--------------------------------------------------------------------------------------
Adds seller business details.
• URL Params
    None
• Data Params
    {
        businessName: string,
        businessDescription: string,
        businessType: string,
        gstNo: string,
        panNo: string,
        address: string,
        city: string,
        state: string,
        pincode: string
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "Business details created successfully", data: {<business_details_object>} }

16. POST :- /api/v1/users/seller/bank-details
--------------------------------------------------------------------------------------
Adds seller bank details.
• URL Params
    None
• Data Params
    {
        bankName: string,
        accountNo: string,
        accountHolderName: string,
        accountType: string,
        ifscCode: string
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "Bank details created successfully", data: {<bank_details_object>} }

17. POST :- /api/v1/users/delivery/profile
--------------------------------------------------------------------------------------
Adds delivery partner personal profile details with profile image upload.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        dob: string,
        gender: string,
        personalAddress: string,
        aadharNumber: string,
        drivingLicense: string,
        emergencyContact: {
            name: string,
            mobile: string
        },
        bankAccountNumber: string,
        ifscCode: string,
        preferences: {
            notifications: boolean,
            theme: string,
            language: string
        },
        profileImage: File // optional image file
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "Delivery partner profile created successfully", data: {<delivery_profile_object>} }

18. POST :- /api/v1/users/delivery/partner-details
--------------------------------------------------------------------------------------
Adds delivery partner work details.
• URL Params
    None
• Data Params
    {
        vehicleType: string,
        vehicleNumber: string
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { success: true, message: "Delivery partner details created successfully", data: {<partner_details_object>} }

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

15. POST :- /api/v1/users/sellerDetails
--------------------------------------------------------------------------------------
Adds seller business details after PAN/GST verification.
• URL Params
    None
• Data Params
    {
        pan: string,
        gst: string,
        businessName: string,
        businessDescription: string,
        businessType: string
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Seller details added successfully" }

16. POST :- /api/v1/users/bankDetails
--------------------------------------------------------------------------------------
Adds seller bank details for payments.
• URL Params
    None
• Data Params
    {
        accountNo: string,
        ifscCode: string,
        bankName: string,
        accountHolderName: string,
        accountType: string
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Bank details added successfully" }

▣ VERIFICATION SERVICES:
======================================================================================

30. POST :- /api/v1/verification/verifyPan
--------------------------------------------------------------------------------------
Verifies PAN number for seller registration using InstantPay API.
• URL Params
    None
• Data Params
    {
        pan: string,
        name: string
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { verified: true, pan: "ABCDE1234F", name: "John Doe", message: "PAN verified successfully" }

31. POST :- /api/v1/verification/verifyGst
--------------------------------------------------------------------------------------
Verifies GST number for seller registration using InstantPay API.
• URL Params
    None
• Data Params
    { gst: string }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { verified: true, gst: "22AAAAA0000A1Z5", businessName: "ABC Company Pvt Ltd", status: "Active", message: "GST verified successfully" }

32. POST :- /api/v1/users/verify-bank-account
--------------------------------------------------------------------------------------
Verifies bank account using penny drop method.
• URL Params
    None
• Data Params
    {
        accountNumber: string,
        ifscCode: string
    }
• Headers
    Content-Type: application/json
• Success Response:
    • Code: 200
    • Content: { verified: true, accountHolderName: "John Doe", message: "Bank account verified" }

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

28. POST :- /api/v1/products/:id/approve
--------------------------------------------------------------------------------------
Approves a product (admin only).
• URL Params
    Required: id=[string]
• Data Params
    {
        "approved": "boolean",
        "reason": "string" // if rejected
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Product approval status updated" }

▣ CATEGORY MANAGEMENT:
======================================================================================

29. GET :- /api/v1/categories/root
--------------------------------------------------------------------------------------
Returns all main/root categories (parent_id: null) with hasChildren flag.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: [{ "_id": "64f1a2b3c4d5e6f7g8h9i0j1", "name": "Electronics", "parent_id": null, "hasChildren": true }]

30. GET :- /api/v1/categories/:parentId/children
--------------------------------------------------------------------------------------
Returns all subcategories for a given parent category with hasChildren flag.
• URL Params
    Required: parentId=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: [{ "_id": "64f1a2b3c4d5e6f7g8h9i0j4", "name": "Smartphones", "parent_id": "64f1a2b3c4d5e6f7g8h9i0j1", "hasChildren": true }]

31. GET :- /api/v1/categories/tree
--------------------------------------------------------------------------------------
Returns complete hierarchical category tree (optional - for advanced use).
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: [{ "_id": "64f1a2b3c4d5e6f7g8h9i0j1", "name": "Electronics", "parent_id": null, "children": [{<category_object>}] }]

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

▣ SELLER ORDER MANAGEMENT:
======================================================================================

52. GET :- /api/v1/sellers/:sellerId/orders
--------------------------------------------------------------------------------------
Returns orders for seller's products.
• URL Params
    Required: sellerId=[string]
    Optional: page=[number], status=[string], dateFrom=[string], dateTo=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "orders": [
            {
                "orderId": "order_123",
                "orderNumber": "ORD-2025-001234",
                "customerName": "John Doe",
                "orderItems": [{<orderitem_object>}], // only seller's items
                "totalAmount": 4999.98,
                "status": "pending",
                "createdAt": "2025-11-29T10:00:00Z"
            }
        ],
        "pagination": {<pagination_object>}
    }

53. PUT :- /api/v1/sellers/:sellerId/orders/:id/status
--------------------------------------------------------------------------------------
Updates order status (seller only).
• URL Params
    Required: sellerId=[string], id=[string] // order ID
• Data Params
    {
        "status": "confirmed", // confirmed, processing, shipped
        "trackingNumber": "TRK123456789", // required for shipped status
        "estimatedDelivery": "2025-12-05T18:00:00Z" // required for shipped status
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        message: "Order status updated successfully",
        "order": {<order_object>}
    }

▣ SELLER EARNINGS MANAGEMENT:
======================================================================================

54. GET :- /api/v1/sellers/earnings
--------------------------------------------------------------------------------------
Returns seller's earnings history with filtering options.
• URL Params
    Optional:
    - page=[number] (default: 1)
    - limit=[number] (default: 10)
    - status=[string] (pending, processed, paid)
    - dateFrom=[string] (YYYY-MM-DD)
    - dateTo=[string] (YYYY-MM-DD)
    - period=[string] (today, week, month, year)
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "earnings": [{<seller_earnings_object>}],
        "summary": {
            "totalEarnings": 25000.00,
            "pendingEarnings": 5000.00,
            "processedEarnings": 20000.00,
            "totalOrders": 150,
            "averageEarningPerOrder": 166.67
        },
        "pagination": {<pagination_object>}
    }

55. GET :- /api/v1/sellers/earnings/summary
--------------------------------------------------------------------------------------
Returns earnings summary for different time periods.
• URL Params
    Optional: period=[string] (today, week, month, year)
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "today": {
            "grossAmount": 2500.00,
            "netAmount": 2100.00,
            "orders": 8,
            "platformFee": 125.00,
            "paymentGatewayFee": 50.00,
            "gstAmount": 225.00
        },
        "thisWeek": {
            "grossAmount": 17500.00,
            "netAmount": 14700.00,
            "orders": 56,
            "platformFee": 875.00,
            "paymentGatewayFee": 350.00,
            "gstAmount": 1575.00
        },
        "thisMonth": {
            "grossAmount": 75000.00,
            "netAmount": 63000.00,
            "orders": 240,
            "platformFee": 3750.00,
            "paymentGatewayFee": 1500.00,
            "gstAmount": 6750.00
        }
    }

56. GET :- /api/v1/sellers/earnings/:orderId
--------------------------------------------------------------------------------------
Returns earnings details for a specific order.
• URL Params
    Required: orderId=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "earning": {<seller_earnings_object>},
        "order": {<order_object>},
        "breakdown": {
            "grossAmount": 2999.99,
            "platformFeeRate": 5.0, // percentage
            "platformFee": 149.99,
            "paymentGatewayFeeRate": 2.0, // percentage
            "paymentGatewayFee": 59.99,
            "gstRate": 18.0, // percentage
            "gstAmount": 449.99,
            "netAmount": 2340.02
        }
    }

57. GET :- /api/v1/sellers/payouts
--------------------------------------------------------------------------------------
Returns seller's payout history.
• URL Params
    Optional: page=[number], limit=[number], status=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "payouts": [
            {
                "id": "payout_123",
                "amount": 15000.00,
                "status": "completed", // pending, processing, completed, failed
                "payoutDate": "2025-11-29T10:00:00Z",
                "bankAccount": "****1234",
                "transactionId": "TXN123456789",
                "earningsCount": 45,
                "createdAt": "2025-11-29T10:00:00Z"
            }
        ],
        "pagination": {<pagination_object>}
    }

58. POST :- /api/v1/sellers/payouts/request
--------------------------------------------------------------------------------------
Requests payout for processed earnings.
• URL Params
    None
• Data Params
    {
        "amount": 15000.00, // optional, defaults to all processed earnings
        "bankAccountId": "bank_123" // optional, uses default bank account
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: {
        "payout": {
            "id": "payout_124",
            "amount": 15000.00,
            "status": "pending",
            "requestedAt": "2025-11-29T10:00:00Z",
            "estimatedPayoutDate": "2025-12-01T10:00:00Z"
        },
        "message": "Payout request submitted successfully"
    }

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



▣ DELIVERY PARTNER PROFILE:
======================================================================================

70. GET :- /api/v1/partner/profile
--------------------------------------------------------------------------------------
Returns partner profile information.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { partner: {<partner_object>} }

71. PUT :- /api/v1/partner/profile
--------------------------------------------------------------------------------------
Updates partner profile information.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        "name": "string",
        "email": "string",
        "vehicleType": "string",
        "vehicleNumber": "string",
        "profileImage": "File" // optional
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Profile updated successfully" }

72. POST :- /api/v1/partner/location
--------------------------------------------------------------------------------------
Updates partner's current location.
• URL Params
    None
• Data Params
    {
        "latitude": "number",
        "longitude": "number"
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Location updated successfully" }

73. PUT :- /api/v1/partner/status
--------------------------------------------------------------------------------------
Updates partner's online/offline status.
• URL Params
    None
• Data Params
    { "isOnline": "boolean" }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Status updated successfully", isOnline: true }

▣ DELIVERY ORDER MANAGEMENT:
======================================================================================

74. GET :- /api/v1/partner/orders/available
--------------------------------------------------------------------------------------
Returns available orders for assignment based on partner location.
• URL Params
    Optional: radius=[number] (default: 10km)
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { orders: [{<order_object_delivery_view>}], count: 5 }

75. GET :- /api/v1/partner/orders
--------------------------------------------------------------------------------------
Returns partner's assigned/accepted orders with pagination.
• URL Params
    Optional: page=[number], limit=[number], status=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { orders: [{<order_object_delivery_view>}], pagination: {<pagination_object>} }

76. GET :- /api/v1/partner/orders/:id
--------------------------------------------------------------------------------------
Returns specific order details for delivery partner.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { order: {<order_object_delivery_view>} }

77. POST :- /api/v1/partner/orders/:id/accept
--------------------------------------------------------------------------------------
Accepts an assigned order.
• URL Params
    Required: id=[string]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Order accepted successfully", order: {<order_object_delivery_view>} }

78. POST :- /api/v1/partner/orders/:id/reject
--------------------------------------------------------------------------------------
Rejects an assigned order.
• URL Params
    Required: id=[string]
• Data Params
    { "reason": "string" } // optional
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Order rejected successfully" }

79. PUT :- /api/v1/partner/orders/:id/status
--------------------------------------------------------------------------------------
Updates order delivery status during delivery process.
• URL Params
    Required: id=[string]
• Data Params
    {
        "status": "string", // picked_up, in_transit, delivered
        "latitude": "number", // current location
        "longitude": "number",
        "notes": "string", // optional
        "otp": "string" // required for delivery confirmation
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Order status updated successfully", order: {<order_object_delivery_view>} }

80. POST :- /api/v1/partner/orders/:id/issue
--------------------------------------------------------------------------------------
Reports an issue with the order.
• URL Params
    Required: id=[string]
• Data Params
    {
        "issueType": "string", // customer_unavailable, wrong_address, payment_issue, damaged_item
        "description": "string",
        "images": ["string"] // optional image URLs
    }
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { message: "Issue reported successfully", issueId: "issue_123" }

▣ DELIVERY PARTNER EARNINGS:
======================================================================================

81. GET :- /api/v1/partner/earnings
--------------------------------------------------------------------------------------
Returns partner's earnings with filtering options.
• URL Params
    Optional: period=[string] (today, week, month), page=[number], limit=[number]
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: {
        "earnings": [{<earning_object>}],
        "summary": {
            "totalEarnings": 7644.00,
            "totalDeliveries": 84,
            "totalTips": 890.00,
            "totalIncentives": 620.00,
            "averagePerDelivery": 91.00
        },
        "pagination": {<pagination_object>}
    }

82. GET :- /api/v1/partner/earnings/summary
--------------------------------------------------------------------------------------
Returns earnings summary for different periods.
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
        "today": {
            "earnings": 856.00,
            "deliveries": 12,
            "tips": 125.00,
            "incentives": 85.00
        },
        "week": {
            "earnings": 7644.00,
            "deliveries": 84,
            "tips": 890.00,
            "incentives": 620.00
        },
        "month": {
            "earnings": 28540.00,
            "deliveries": 312,
            "tips": 3240.00,
            "incentives": 2180.00
        }
    }

▣ NAVIGATION & ROUTE APIS:
======================================================================================

83. GET :- /api/v1/partner/orders/:id/route
--------------------------------------------------------------------------------------
Returns optimized route for order delivery.
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
        "route": {
            "distance": 5.2, // km
            "duration": 25, // minutes
            "steps": [
                {
                    "instruction": "Head north on Main St",
                    "distance": 0.5,
                    "duration": 2
                }
            ],
            "polyline": "encoded_polyline_string",
            "pickupLocation": {
                "latitude": 19.0544,
                "longitude": 72.8294
            },
            "deliveryLocation": {
                "latitude": 19.0760,
                "longitude": 72.8777
            }
        }
    }

84. GET :- /api/v1/partner/orders/:id/navigation-links
--------------------------------------------------------------------------------------
Returns deep links for external navigation apps.
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
        "googleMaps": "https://maps.google.com/maps?daddr=19.0760,72.8777",
        "appleMaps": "http://maps.apple.com/?daddr=19.0760,72.8777",
        "pickupAddress": "Shop 15, Linking Road, Bandra West",
        "deliveryAddress": "123 Main St, Apartment 4B"
    }

▣ DOCUMENT MANAGEMENT:
======================================================================================

85. GET :- /api/v1/partner/documents
--------------------------------------------------------------------------------------
Returns partner's uploaded documents.
• URL Params
    None
• Data Params
    None
• Headers
    Content-Type: application/json
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 200
    • Content: { documents: [{<document_object>}] }

86. POST :- /api/v1/partner/documents
--------------------------------------------------------------------------------------
Uploads new document.
• URL Params
    None
• Data Params (multipart/form-data)
    {
        "type": "string", // driving_license, aadhar, pan, vehicle_rc, insurance
        "documentNumber": "string",
        "expiryDate": "string", // YYYY-MM-DD, optional
        "documentImage": "File"
    }
• Headers
    Content-Type: multipart/form-data
    Authorization: Bearer <OAuth Token>
• Success Response:
    • Code: 201
    • Content: { message: "Document uploaded successfully", document: {<document_object>} }

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