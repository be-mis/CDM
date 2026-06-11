-- Migration 060: Add gcash_name to reimbursements and create reimbursement_transportation table
USE `cdmdb`;

-- 1. Add gcash_name to reimbursements
ALTER TABLE `reimbursements` 
  ADD COLUMN `gcash_name` VARCHAR(500) NULL DEFAULT NULL AFTER `payment_method`;

-- 2. Create reimbursement_transportation table
CREATE TABLE IF NOT EXISTS `reimbursement_transportation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reimbursement_id` INT UNSIGNED NOT NULL,
  `date_covered` DATE NULL,
  `store` VARCHAR(255) NULL,
  `from_location` VARCHAR(255) NULL,
  `to_location` VARCHAR(255) NULL,
  `mode_of_transport` VARCHAR(100) NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_reimbursement_id` (`reimbursement_id`),
  FOREIGN KEY (`reimbursement_id`) REFERENCES `reimbursements`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
