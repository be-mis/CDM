-- Migration 043: Rename payment_reason to gcash_name to avoid confusion
USE `cdmdb`;

-- Only run if payment_reason exists and gcash_name does NOT exist
SET @dbname = DATABASE();
SET @tablename = "cash_advances";
SET @columnname = "payment_reason";
SET @prevexists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);

SET @newcolumnname = "gcash_name";
SET @newexists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @newcolumnname);

SET @sql = IF(@prevexists > 0 AND @newexists = 0, 
              'ALTER TABLE `cash_advances` CHANGE COLUMN `payment_reason` `gcash_name` VARCHAR(500) NULL DEFAULT NULL', 
              'SELECT "Column already renamed or missing"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
