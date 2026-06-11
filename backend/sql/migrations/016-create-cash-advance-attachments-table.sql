-- Migration 016: Create cash advance attachments table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `cash_advance_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cash_advance_id` INT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(100) NULL,
  `file_size` INT UNSIGNED NULL,
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cash_advance_id` (`cash_advance_id`),
  FOREIGN KEY (`cash_advance_id`) REFERENCES `cash_advances`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
