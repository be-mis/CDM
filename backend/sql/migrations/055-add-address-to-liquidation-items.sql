USE `cdmdb`;

ALTER TABLE `liquidation_items`
ADD COLUMN `address` VARCHAR(255) NULL AFTER `vendor`;
