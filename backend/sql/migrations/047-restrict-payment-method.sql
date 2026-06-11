-- Migration 047: Restrict payment_method to gcash and payroll only
USE `cdmdb`;

-- 1. Migrate legacy 'cash' to 'gcash'
UPDATE `cash_advances` SET `payment_method` = 'gcash' WHERE `payment_method` = 'cash';

-- 2. Handle any other invalid values (set to payroll default)
UPDATE `cash_advances` SET `payment_method` = 'payroll' WHERE `payment_method` NOT IN ('gcash', 'payroll');

-- 3. Modify column to restrict ENUM
ALTER TABLE `cash_advances` 
MODIFY COLUMN `payment_method` ENUM('gcash', 'payroll') NOT NULL DEFAULT 'payroll';
