-- Migration 036: Add payment_reason column to liquidations table
USE `cdmdb`;

-- Add payment_reason column for when payment method is 'cash'
ALTER TABLE `liquidations` ADD COLUMN `payment_reason` VARCHAR(255) NULL AFTER `payment_method`;
