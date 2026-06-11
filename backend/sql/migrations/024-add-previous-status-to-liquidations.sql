-- Migration 024: Add previous_status column to liquidations so we can restore CA state on revert
USE `cdmdb`;

ALTER TABLE `liquidations`
  ADD COLUMN IF NOT EXISTS `previous_status` VARCHAR(50) DEFAULT NULL AFTER `status`;
