-- Migration 012: Create disbursement line items table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `disbursement_line_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `disbursement_id` INT UNSIGNED NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `account_code` VARCHAR(50) NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_disbursement_id` (`disbursement_id`),
  FOREIGN KEY (`disbursement_id`) REFERENCES `disbursements`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
