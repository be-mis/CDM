-- Migration 059: Add business_unit column to reimbursements table
USE `cdmdb`;

ALTER TABLE `reimbursements`
  ADD COLUMN `business_unit` VARCHAR(50) NULL AFTER `department_id`;
