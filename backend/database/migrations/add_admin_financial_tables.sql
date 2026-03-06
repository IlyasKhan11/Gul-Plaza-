-- Migration: Add admin financial management tables
-- Tables: platform_settings, withdrawal_requests

-- Platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default commission rate if not exists
INSERT INTO platform_settings (key, value, description)
VALUES ('commission_rate', '5', 'Platform commission rate percentage (0-50)')
ON CONFLICT (key) DO NOTHING;

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_seller_id ON withdrawal_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Add transaction_slips table if it doesn't exist (for tracking order transactions)
CREATE TABLE IF NOT EXISTS transaction_slips (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    slip_image_url TEXT,
    amount DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transaction_slips_order_id ON transaction_slips(order_id);
CREATE INDEX IF NOT EXISTS idx_transaction_slips_status ON transaction_slips(status);
