-- 010-add-user-fields.sql
-- Add role, department, and business_unit columns to users table
USE `cdmdb`;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `role` VARCHAR(100) DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS `department` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `business_unit` VARCHAR(100) DEFAULT NULL;
