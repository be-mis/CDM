-- Migration 037: Create tables for Travel Advance Liquidation
-- Transportation and Other Expenses per Activity
USE `cdmdb`;

-- Table for Transportation entries (linked to activities)
CREATE TABLE IF NOT EXISTS `liquidation_transportation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `liquidation_id` INT UNSIGNED NOT NULL,
  `activity_id` INT UNSIGNED NOT NULL,
  `date_covered` VARCHAR(100) NULL COMMENT 'Date range string e.g. January 20, 2026 - January 22, 2026',
  `destination` VARCHAR(255) NULL COMMENT 'Cached from activity',
  `from_location` VARCHAR(255) NULL,
  `to_location` VARCHAR(255) NULL,
  `mode_of_transport` VARCHAR(100) NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_liquidation_id` (`liquidation_id`),
  INDEX `idx_activity_id` (`activity_id`),
  FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`activity_id`) REFERENCES `cash_advance_activities`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for Other Expenses entries (linked to activities)
CREATE TABLE IF NOT EXISTS `liquidation_other_expenses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `liquidation_id` INT UNSIGNED NOT NULL,
  `activity_id` INT UNSIGNED NOT NULL,
  `date_covered` VARCHAR(100) NULL COMMENT 'Date range string',
  `destination` VARCHAR(255) NULL COMMENT 'Cached from activity',
  `particulars` VARCHAR(500) NOT NULL,
  `no_of_days` INT UNSIGNED NULL DEFAULT 0,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `receipt_number` VARCHAR(100) NULL,
  `vendor` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_liquidation_id` (`liquidation_id`),
  INDEX `idx_activity_id` (`activity_id`),
  FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`activity_id`) REFERENCES `cash_advance_activities`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
