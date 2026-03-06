-- Migration: Add missing columns to product_reports table
-- Run this if product_reports was created without reviewed_by, reviewed_at, admin_notes

ALTER TABLE product_reports
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP(0) WITHOUT TIME ZONE;
