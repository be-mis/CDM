-- Migration 018: Create liquidation items table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `liquidation_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `liquidation_id` INT UNSIGNED NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `category` VARCHAR(100) NULL,
  `estimated_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `actual_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `variance` DECIMAL(15, 2) GENERATED ALWAYS AS (`estimated_amount` - `actual_amount`) STORED,
  `receipt_number` VARCHAR(100) NULL,
  `vendor` VARCHAR(255) NULL,
  `expense_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_liquidation_id` (`liquidation_id`),
  FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
