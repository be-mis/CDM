-- Migration 056: Align liquidations payment fields with cash_advances table
USE `cdmdb`;

-- 1. Migrate legacy payment method values
UPDATE `liquidations` SET `payment_method` = 'gcash' WHERE `payment_method` = 'cash';
UPDATE `liquidations` SET `payment_method` = 'payroll' WHERE `payment_method` = 'bank_transfer';
UPDATE `liquidations` SET `payment_method` = 'payroll' WHERE `payment_method` = 'check';
UPDATE `liquidations` SET `payment_method` = NULL WHERE `payment_method` = 'offset';

-- 2. Modify payment_method column to match cash_advances ENUM
ALTER TABLE `liquidations` 
MODIFY COLUMN `payment_method` ENUM('gcash', 'payroll') NULL DEFAULT NULL;

-- 3. Rename payment_reason to gcash_name if not already done
SET @dbname = DATABASE();
SET @tablename = "liquidations";
SET @columnname = "payment_reason";
SET @prevexists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);

SET @newcolumnname = "gcash_name";
SET @newexists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @newcolumnname);

SET @sql = IF(@prevexists > 0 AND @newexists = 0, 
              'ALTER TABLE `liquidations` CHANGE COLUMN `payment_reason` `gcash_name` VARCHAR(500) NULL DEFAULT NULL', 
              'SELECT "Column already renamed or missing"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Drop check_number column if exists (not used anymore)
SET @columnname = "check_number";
SET @columnexists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);

SET @dropcolsql = IF(@columnexists > 0, 
              'ALTER TABLE `liquidations` DROP COLUMN `check_number`', 
              'SELECT "check_number column already dropped"');

PREPARE stmt2 FROM @dropcolsql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
