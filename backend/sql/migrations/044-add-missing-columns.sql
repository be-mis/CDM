-- Migration 044: Add missing columns check_number and gcash_name to cash_advances
USE `cdmdb`;

SET @dbname = DATABASE();
SET @tablename = "cash_advances";

-- 1. Check/Add check_number
SET @col_check = "check_number";
SET @has_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col_check);

SET @sql_check = IF(@has_check = 0, 
    'ALTER TABLE `cash_advances` ADD COLUMN `check_number` VARCHAR(50) NULL DEFAULT NULL', 
    'SELECT "check_number already exists"');

PREPARE stmt_check FROM @sql_check; 
EXECUTE stmt_check; 
DEALLOCATE PREPARE stmt_check;

-- 2. Check/Add gcash_name (handling rename if payment_reason exists)
SET @col_reason = "payment_reason";
SET @has_reason = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col_reason);

SET @col_gcash = "gcash_name";
SET @has_gcash = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col_gcash);

SET @sql_gcash = CASE
    WHEN @has_gcash > 0 THEN 'SELECT "gcash_name already exists"'
    WHEN @has_reason > 0 THEN 'ALTER TABLE `cash_advances` CHANGE COLUMN `payment_reason` `gcash_name` VARCHAR(500) NULL DEFAULT NULL'
    ELSE 'ALTER TABLE `cash_advances` ADD COLUMN `gcash_name` VARCHAR(500) NULL DEFAULT NULL'
END;

PREPARE stmt_gcash FROM @sql_gcash; 
EXECUTE stmt_gcash; 
DEALLOCATE PREPARE stmt_gcash;
