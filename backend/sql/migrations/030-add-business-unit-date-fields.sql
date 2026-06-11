-- Migration 030: Add business_unit, date_needed, and date_coverage columns to cash_advances table
USE `cdmdb`;

ALTER TABLE `cash_advances`
  ADD COLUMN IF NOT EXISTS `business_unit` VARCHAR(50) NULL AFTER `department_id`,
  ADD COLUMN IF NOT EXISTS `date_needed` DATE NULL AFTER `account_number`,
  ADD COLUMN IF NOT EXISTS `date_coverage` VARCHAR(255) NULL AFTER `date_needed`;
