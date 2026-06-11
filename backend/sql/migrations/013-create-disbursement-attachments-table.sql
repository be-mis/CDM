-- Migration 013: Create disbursement attachments table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `disbursement_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `disbursement_id` INT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(100) NULL,
  `file_size` INT UNSIGNED NULL,
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_disbursement_id` (`disbursement_id`),
  FOREIGN KEY (`disbursement_id`) REFERENCES `disbursements`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
