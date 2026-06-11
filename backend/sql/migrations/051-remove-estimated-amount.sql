USE `cdmdb`;

-- Remove variance column (dependent on estimated_amount)
ALTER TABLE `liquidation_items` DROP COLUMN `variance`;

-- Remove estimated_amount column from liquidation_items
ALTER TABLE `liquidation_items` DROP COLUMN `estimated_amount`;
