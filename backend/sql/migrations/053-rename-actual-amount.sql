USE `cdmdb`;

-- Rename actual_amount to amount in liquidation_items
ALTER TABLE `liquidation_items` CHANGE COLUMN `actual_amount` `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00;
