-- Migration 029: Remove category column from liquidation_items and reimbursement_items tables
USE `cdmdb`;

-- Drop category column from liquidation_items if it exists
SET @col_exists_liq = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'cdmdb' AND TABLE_NAME = 'liquidation_items' AND COLUMN_NAME = 'category');

SET @sql_liq = IF(@col_exists_liq > 0, 
  'ALTER TABLE `liquidation_items` DROP COLUMN `category`', 
  'SELECT "Column category already removed from liquidation_items" AS info');
PREPARE stmt_liq FROM @sql_liq;
EXECUTE stmt_liq;
DEALLOCATE PREPARE stmt_liq;

-- Drop category column from reimbursement_items if it exists
SET @col_exists_reimb = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'cdmdb' AND TABLE_NAME = 'reimbursement_items' AND COLUMN_NAME = 'category');

SET @sql_reimb = IF(@col_exists_reimb > 0, 
  'ALTER TABLE `reimbursement_items` DROP COLUMN `category`', 
  'SELECT "Column category already removed from reimbursement_items" AS info');
PREPARE stmt_reimb FROM @sql_reimb;
EXECUTE stmt_reimb;
DEALLOCATE PREPARE stmt_reimb;
