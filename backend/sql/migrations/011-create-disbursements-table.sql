-- Migration 011: Create disbursements table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `disbursements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `disbursement_number` VARCHAR(50) NOT NULL UNIQUE,
  `disbursement_date` DATE NOT NULL,
  `requested_by` VARCHAR(191) NOT NULL,
  `department_id` INT NOT NULL,
  `payee` VARCHAR(255) NOT NULL,
  `payment_method` ENUM('check', 'bank_transfer', 'cash', 'online_payment') NOT NULL DEFAULT 'check',
  `check_number` VARCHAR(50) NULL,
  `account_number` VARCHAR(100) NULL,
  `purpose` TEXT NOT NULL,
  `category` ENUM('operational', 'capital', 'payroll', 'utilities', 'supplies', 'services', 'travel', 'other') NOT NULL DEFAULT 'operational',
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('draft', 'pending', 'approved', 'rejected', 'disbursed', 'cancelled') NOT NULL DEFAULT 'draft',
  `created_by` INT UNSIGNED NULL,
  `approved_by` INT UNSIGNED NULL,
  `approved_at` TIMESTAMP NULL,
  `disbursed_at` TIMESTAMP NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_disbursement_number` (`disbursement_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_created_by` (`created_by`),
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
