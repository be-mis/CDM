-- Migration 061: Update payment_method enum for reimbursements table
USE `cdmdb`;

-- 1. Migrate legacy values if any exist (check, bank_transfer, cash)
-- Map 'cash' to 'gcash'
UPDATE `reimbursements` SET `payment_method` = 'gcash' WHERE `payment_method` = 'cash';
-- Map 'check' or 'bank_transfer' or empty to 'payroll'
UPDATE `reimbursements` SET `payment_method` = 'payroll' WHERE `payment_method` NOT IN ('gcash', 'payroll') OR `payment_method` = '';

-- 2. Modify column to restrict ENUM to gcash and payroll
ALTER TABLE `reimbursements` 
MODIFY COLUMN `payment_method` ENUM('gcash', 'payroll') NOT NULL DEFAULT 'payroll';
