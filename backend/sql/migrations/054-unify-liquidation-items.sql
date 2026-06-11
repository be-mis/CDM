USE `cdmdb`;

-- Add columns to liquidation_items to support unification
ALTER TABLE `liquidation_items`
ADD COLUMN `activity_id` INT UNSIGNED NULL AFTER `liquidation_id`,
ADD COLUMN `no_of_days` INT UNSIGNED NULL DEFAULT 0 AFTER `description`,
ADD COLUMN `date_covered` VARCHAR(100) NULL AFTER `expense_date`,
ADD INDEX `idx_item_activity` (`activity_id`),
ADD FOREIGN KEY (`activity_id`) REFERENCES `cash_advance_activities`(`id`) ON DELETE CASCADE;

-- Drop liquidation_other_expenses table
DROP TABLE IF EXISTS `liquidation_other_expenses`;
