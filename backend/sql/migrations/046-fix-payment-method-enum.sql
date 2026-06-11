-- Migration 046: Fix payment_method enum to include gcash
USE `cdmdb`;

ALTER TABLE `cash_advances` 
MODIFY COLUMN `payment_method` ENUM('cash', 'payroll', 'check', 'gcash', 'bank_transfer') DEFAULT 'payroll';
