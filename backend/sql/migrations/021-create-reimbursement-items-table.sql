-- Migration 021: Create reimbursement items table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `reimbursement_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reimbursement_id` INT UNSIGNED NOT NULL,
  `expense_date` DATE NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `category` VARCHAR(100) NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `receipt_number` VARCHAR(100) NULL,
  `vendor` VARCHAR(255) NULL,
  `account_code` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_reimbursement_id` (`reimbursement_id`),
  FOREIGN KEY (`reimbursement_id`) REFERENCES `reimbursements`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
