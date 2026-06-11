-- Migration 038: Replace 'cash' payment method with 'gcash'
USE `cdmdb`;

-- Update existing records
UPDATE `cash_advances` 
SET `payment_method` = 'gcash' 
WHERE `payment_method` = 'cash';

-- Modify the column to allow gcash instead of cash
ALTER TABLE `cash_advances` 
MODIFY COLUMN `payment_method` ENUM('gcash', 'payroll') NOT NULL DEFAULT 'payroll';
