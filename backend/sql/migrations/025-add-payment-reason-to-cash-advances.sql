-- Migration 025: Add payment_reason column to cash_advances table
USE `cdmdb`;

ALTER TABLE `cash_advances` 
ADD COLUMN IF NOT EXISTS `payment_reason` VARCHAR(500) NULL AFTER `payment_method`;
