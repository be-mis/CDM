-- Migration 026: Update payment_method ENUM to only cash and payroll
USE `cdmdb`;

-- Update existing records that use check or bank_transfer to payroll
UPDATE `cash_advances` 
SET `payment_method` = 'payroll' 
WHERE `payment_method` IN ('check', 'bank_transfer');

-- Modify the column to only allow cash and payroll
ALTER TABLE `cash_advances` 
MODIFY COLUMN `payment_method` ENUM('cash', 'payroll') NOT NULL DEFAULT 'payroll';
