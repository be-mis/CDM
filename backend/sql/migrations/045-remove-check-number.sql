-- Migration 045: Remove unused check_number column
USE `cdmdb`;

SET @dbname = DATABASE();
SET @tablename = "cash_advances";
SET @columnname = "check_number";
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);

SET @sql = IF(@exists > 0, 
              'ALTER TABLE `cash_advances` DROP COLUMN `check_number`', 
              'SELECT "check_number already removed"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
