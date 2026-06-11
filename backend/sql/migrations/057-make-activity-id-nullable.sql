-- Migration 057: Make activity_id nullable in liquidation_transportation
USE `cdmdb`;

ALTER TABLE `liquidation_transportation` MODIFY COLUMN `activity_id` INT UNSIGNED NULL;
