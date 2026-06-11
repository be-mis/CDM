-- Migration 028: Rename description column to particulars in all item tables
USE `cdmdb`;

-- Only rename if description column exists (idempotent)
SET @col_exists_ca = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'cdmdb' AND TABLE_NAME = 'cash_advance_items' AND COLUMN_NAME = 'description');
SET @col_exists_liq = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'cdmdb' AND TABLE_NAME = 'liquidation_items' AND COLUMN_NAME = 'description');
SET @col_exists_reimb = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'cdmdb' AND TABLE_NAME = 'reimbursement_items' AND COLUMN_NAME = 'description');

SET @sql_ca = IF(@col_exists_ca > 0, 
  'ALTER TABLE `cash_advance_items` CHANGE COLUMN `description` `particulars` VARCHAR(500) NOT NULL', 
  'SELECT "Column description already renamed to particulars in cash_advance_items" AS info');
PREPARE stmt_ca FROM @sql_ca;
EXECUTE stmt_ca;
DEALLOCATE PREPARE stmt_ca;

SET @sql_liq = IF(@col_exists_liq > 0, 
  'ALTER TABLE `liquidation_items` CHANGE COLUMN `description` `particulars` VARCHAR(500) NOT NULL', 
  'SELECT "Column description already renamed to particulars in liquidation_items" AS info');
PREPARE stmt_liq FROM @sql_liq;
EXECUTE stmt_liq;
DEALLOCATE PREPARE stmt_liq;

SET @sql_reimb = IF(@col_exists_reimb > 0, 
  'ALTER TABLE `reimbursement_items` CHANGE COLUMN `description` `particulars` VARCHAR(500) NOT NULL', 
  'SELECT "Column description already renamed to particulars in reimbursement_items" AS info');
PREPARE stmt_reimb FROM @sql_reimb;
EXECUTE stmt_reimb;
DEALLOCATE PREPARE stmt_reimb;
