-- Migration 039: Add payment details to users table
USE `cdmdb`;

ALTER TABLE `users`
ADD COLUMN `payroll_account` VARCHAR(50) NULL AFTER `department`,
ADD COLUMN `gcash_number` VARCHAR(20) NULL AFTER `payroll_account`,
ADD COLUMN `gcash_name` VARCHAR(100) NULL AFTER `gcash_number`;
