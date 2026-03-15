-- Migration: Add is_approved column to stores table
-- This is required by the Admin Dashboard and seller application workflow

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Update existing stores to be approved if they are already active
UPDATE stores SET is_approved = true WHERE is_active = true;
