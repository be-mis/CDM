-- Migration 062: Add alert_sent_at column to cash_advances
USE `cdmdb`;

ALTER TABLE `cash_advances` ADD COLUMN `alert_sent_at` TIMESTAMP NULL;
