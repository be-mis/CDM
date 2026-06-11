USE `cdmdb`;

-- Add new columns to liquidations table
ALTER TABLE `liquidations`
ADD COLUMN `business_unit` VARCHAR(50) NULL AFTER `department_id`,
ADD COLUMN `date_of_ca` DATE NULL AFTER `cash_advance_id`,
ADD COLUMN `start_date` DATE NULL AFTER `date_of_ca`,
ADD COLUMN `end_date` DATE NULL AFTER `start_date`,
ADD COLUMN `date_coverage` VARCHAR(100) NULL AFTER `end_date`;
