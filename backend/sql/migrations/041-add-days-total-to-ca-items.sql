USE `cdmdb`;
ALTER TABLE `cash_advance_items` ADD COLUMN `no_of_days` INT NOT NULL DEFAULT 1;
ALTER TABLE `cash_advance_items` ADD COLUMN `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
