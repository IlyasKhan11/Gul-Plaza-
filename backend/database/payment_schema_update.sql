-- Payment System Schema Update - Day 5
-- Add payment method and status fields to orders table

-- Add payment method column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT NULL;

-- Add payment status column  
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';

-- Create enum types for data integrity
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('COD', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'VERIFIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'AWAITING_VERIFICATION', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update columns to use enum types (if they don't already use them)
-- Note: This might require data migration if columns already exist

-- Add constraints for payment methods
ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS chk_payment_method 
CHECK (payment_method IN ('COD', 'BANK_TRANSFER') OR payment_method IS NULL);

-- Add constraints for payment status
ALTER TABLE orders
ADD CONSTRAINT IF NOT EXISTS chk_payment_status 
CHECK (payment_status IN ('PENDING', 'VERIFIED'));

-- Add constraints for order status
ALTER TABLE orders
ADD CONSTRAINT IF NOT EXISTS chk_order_status 
CHECK (status IN ('PENDING', 'CONFIRMED', 'AWAITING_VERIFICATION', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'));

-- Create indexes for payment-related queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_payment ON orders(status, payment_status);

-- Create composite index for admin payment verification queries
CREATE INDEX IF NOT EXISTS idx_orders_admin_payment ON orders(status, payment_status, payment_method) 
WHERE status IN ('AWAITING_VERIFICATION', 'CONFIRMED');

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_method IS 'Payment method: COD (Cash on Delivery) or BANK_TRANSFER';
COMMENT ON COLUMN orders.payment_status IS 'Payment verification status: PENDING or VERIFIED';
COMMENT ON CONSTRAINT chk_payment_method ON orders IS 'Ensures only valid payment methods are used';
COMMENT ON CONSTRAINT chk_payment_status ON orders IS 'Ensures only valid payment statuses are used';
COMMENT ON CONSTRAINT chk_order_status ON orders IS 'Ensures only valid order statuses are used';

-- Create payment verification audit table (optional but recommended)
CREATE TABLE IF NOT EXISTS payment_verifications (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for payment verifications
CREATE INDEX IF NOT EXISTS idx_payment_verifications_order_id ON payment_verifications(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_admin_id ON payment_verifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_created_at ON payment_verifications(created_at);

-- Add comments for audit table
COMMENT ON TABLE payment_verifications IS 'Audit trail for payment status changes';
COMMENT ON COLUMN payment_verifications.verification_notes IS 'Admin notes for payment verification';

-- Create function to validate order status transitions
CREATE OR REPLACE FUNCTION validate_order_status_transition(
    current_status VARCHAR(20),
    new_status VARCHAR(20),
    payment_method VARCHAR(20) DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- PENDING can go to CONFIRMED (COD) or AWAITING_VERIFICATION (BANK_TRANSFER) or CANCELLED
    IF current_status = 'PENDING' THEN
        RETURN new_status IN ('CONFIRMED', 'AWAITING_VERIFICATION', 'CANCELLED');
    END IF;
    
    -- CONFIRMED can go to SHIPPED or CANCELLED
    IF current_status = 'CONFIRMED' THEN
        RETURN new_status IN ('SHIPPED', 'CANCELLED');
    END IF;
    
    -- AWAITING_VERIFICATION can only go to PAID (after admin verification)
    IF current_status = 'AWAITING_VERIFICATION' THEN
        RETURN new_status = 'PAID';
    END IF;
    
    -- PAID can go to SHIPPED
    IF current_status = 'PAID' THEN
        RETURN new_status = 'SHIPPED';
    END IF;
    
    -- SHIPPED can go to DELIVERED
    IF current_status = 'SHIPPED' THEN
        RETURN new_status = 'DELIVERED';
    END IF;
    
    -- CANCELLED and DELIVERED are final states
    IF current_status IN ('CANCELLED', 'DELIVERED') THEN
        RETURN FALSE;
    END IF;
    
    -- Invalid transition
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change() RETURNS TRIGGER AS $$
BEGIN
    -- Log payment verification when status changes from AWAITING_VERIFICATION to PAID
    IF OLD.status = 'AWAITING_VERIFICATION' AND NEW.status = 'PAID' THEN
        INSERT INTO payment_verifications (
            order_id, 
            admin_id, 
            previous_status, 
            new_status, 
            payment_method,
            verification_notes
        ) VALUES (
            NEW.id,
            NEW.updated_by, -- This would need to be added to orders table
            OLD.status,
            NEW.status,
            NEW.payment_method,
            'Payment verified and order marked as paid'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger would need to be created after adding updated_by column to orders table
-- For now, the audit logging will be handled in the application layer

-- Grant permissions (adjust as needed)
-- GRANT USAGE ON SCHEMA public TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Verify the schema changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND column_name IN ('payment_method', 'payment_status');
