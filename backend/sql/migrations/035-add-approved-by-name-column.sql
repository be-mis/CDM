-- Migration 035: Add approved_by_name column to request tables
USE `cdmdb`;

-- Add approved_by_name column to cash_advances table
ALTER TABLE `cash_advances` 
ADD COLUMN `approved_by_name` VARCHAR(255) NULL AFTER `approved_by`;

-- Add approved_by_name column to liquidations table
ALTER TABLE `liquidations` 
ADD COLUMN `approved_by_name` VARCHAR(255) NULL AFTER `approved_by`;

-- Add approved_by_name column to reimbursements table
ALTER TABLE `reimbursements` 
ADD COLUMN `approved_by_name` VARCHAR(255) NULL AFTER `approved_by`;
