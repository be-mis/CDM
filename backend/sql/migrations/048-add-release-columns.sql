-- Migration: Add disbursement release columns to request tables
USE `cdmdb`;
-- This adds columns to track when funds are released by Accounting

-- Add release columns to cash_advances
ALTER TABLE cash_advances ADD COLUMN IF NOT EXISTS released_by VARCHAR(255) NULL;
ALTER TABLE cash_advances ADD COLUMN IF NOT EXISTS released_at DATETIME NULL;
ALTER TABLE cash_advances ADD COLUMN IF NOT EXISTS release_remarks TEXT NULL;

-- Add release columns to liquidations
ALTER TABLE liquidations ADD COLUMN IF NOT EXISTS released_by VARCHAR(255) NULL;
ALTER TABLE liquidations ADD COLUMN IF NOT EXISTS released_at DATETIME NULL;
ALTER TABLE liquidations ADD COLUMN IF NOT EXISTS release_remarks TEXT NULL;

-- Add release columns to reimbursements
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS released_by VARCHAR(255) NULL;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS released_at DATETIME NULL;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS release_remarks TEXT NULL;

-- Update status enum to include 'released' status
-- Note: This may need to be run separately if the column is an ENUM type
-- ALTER TABLE cash_advances MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'released') DEFAULT 'draft';
-- ALTER TABLE liquidations MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'released') DEFAULT 'draft';
-- ALTER TABLE reimbursements MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'released') DEFAULT 'draft';
