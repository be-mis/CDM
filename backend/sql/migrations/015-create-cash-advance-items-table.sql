-- Migration 015: Create cash advance items table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `cash_advance_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cash_advance_id` INT UNSIGNED NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `estimated_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cash_advance_id` (`cash_advance_id`),
  FOREIGN KEY (`cash_advance_id`) REFERENCES `cash_advances`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
