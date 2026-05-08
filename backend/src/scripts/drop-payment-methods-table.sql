-- Drop payment_methods table — payment handling is now fully managed by Razorpay
DROP INDEX IF EXISTS idx_payment_methods_user_id;
DROP TABLE IF EXISTS payment_methods;
