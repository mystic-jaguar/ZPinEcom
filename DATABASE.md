# Database Tables

## Active Tables (used by customer app)

### users
id, user_name, name, mobile, email, password_hash, user_role, is_verified, is_active, google_id, dob, gender, profile_image, receive_push_notifications, receive_email_updates, receive_order_updates, created_at, updated_at

### refresh_tokens
id, user_id, token, expires_at, created_at

### auth_tokens
id, user_id, email, mobile, token, token_type, is_used, expires_at, created_at

### addresses
id, user_id, name, phone, address_line1, address_line2, city, state, pincode, country, landmark, label, is_default, created_at, updated_at

### cart_items
id, user_id, product_id, quantity, price_at_add, created_at, updated_at

### wishlists
id, user_id, product_id, created_at

### orders
id, order_number, user_id, status, payment_status, total_amount, shipping_amount, tax_amount, final_amount, shipping_address, payment_method, payment_id, notes, tracking_number, estimated_delivery, created_at, updated_at

### order_items
id, order_id, product_id, product_name, quantity, price, image, variant, created_at

### products
id, user_id, product_name, description, category_id, deepest_category_name, category_path, price, quantity, in_stock, is_approved, approval_notes, search_tags, search_vector, extracted_attributes, size_quantities, created_at, updated_at

### product_images
id, product_id, image_url, display_order, created_at

### product_reviews
id, product_id, user_id, rating, comment, images, is_verified_purchase, created_at, updated_at

### coupons
id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, valid_from, valid_until, usage_limit, usage_count, is_active, created_at, updated_at

### categories
id, name, parent_id, description, image_url, is_active, created_at, updated_at

---

## Other App Tables (seller / delivery / admin — not used by customer app)

### admin_users
id, name, email, password_hash, role, permissions, status, created_at

### notifications
id, user_id, title, message, type, data, is_read, created_at

### payments
id, user_id, amount, currency, payment_method, gateway_payment_id, gateway_order_id, gateway_signature, status, created_at, updated_at

### refunds
id, payment_id, amount, reason, gateway_refund_id, status, created_at, updated_at

### return_requests
id, order_id, user_id, order_item_ids, reason, description, images, status, created_at, updated_at

### order_status_history
id, order_id, status, note, created_by, created_at

### seller_profiles
id, user_id, dob, gender, personal_address, personal_pan_no, emergency_contact, profile_image, preferences, created_at, updated_at

### seller_business_details
id, user_id, business_name, business_description, business_type, gst_no, pan_no, address, city, state, pincode, coordinates, is_verified, created_at, updated_at

### seller_bank_details
id, user_id, bank_name, account_no, account_holder_name, account_type, ifsc_code, is_verified, created_at, updated_at

### seller_earnings
id, seller_id, order_id, order_number, gross_amount, platform_fee, payment_gateway_fee, gst_amount, net_amount, status, payout_date, payout_id, created_at, updated_at

### seller_payouts
id, seller_id, amount, status, bank_account_id, transaction_id, earnings_count, payout_date, created_at, updated_at

### delivery_partner_profiles
id, user_id, dob, gender, personal_address, aadhar_number, driving_license, emergency_contact, bank_account_number, ifsc_code, profile_image, preferences, is_online, current_location, created_at, updated_at

### delivery_partner_details
id, user_id, vehicle_type, vehicle_number, is_verified, created_at, updated_at

### delivery_partner_documents
id, user_id, document_type, document_number, document_image, expiry_date, is_verified, created_at, updated_at

### delivery_partner_earnings
id, partner_id, order_id, delivery_fee, tips, incentives, total_earning, status, created_at, updated_at

### shipping_addresses
id, user_id, name, phone, address_line1, address_line2, city, state, pincode, country, landmark, label, coordinates, is_default, created_at, updated_at

---

## Legacy Tables (deleted)

### customer_users
id, user_name, name, mobile, email, password_hash, user_role, is_verified, is_active, created_at, updated_at

### customer_profile_details
id, user_id, dob, gender, profile_image, receive_push_notifications, receive_email_updates, receive_order_updates, created_at, updated_at

### customer_profiles
id, user_id, dob, gender, profile_image, account_type, preferences, receive_push_notifications, receive_email_updates, receive_order_updates, created_at, updated_at

### customer_refresh_tokens
id, user_id, token, expires_at, created_at

### customer_password_reset_tokens
id, user_id, reset_token, expires_at, is_used, created_at

### customer_shipping_addresses
id, user_id, name, phone, address_line1, address_line2, city, state, pincode, country, landmark, label, is_default, created_at, updated_at

### customer_cart_items
id, user_id, product_id, quantity, price_at_add, created_at, updated_at

### customer_wishlists
id, user_id, product_id, created_at

### customer_orders
id, order_number, user_id, seller_id, status, payment_status, total_amount, shipping_amount, tax_amount, final_amount, shipping_address, payment_method, payment_id, notes, estimated_delivery, tracking_number, created_at, updated_at

### customer_order_items
id, order_id, product_id, product_name, quantity, price, image, variant, created_at
