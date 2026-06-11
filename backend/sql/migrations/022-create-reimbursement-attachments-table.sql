-- Migration 022: Create reimbursement attachments table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `reimbursement_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reimbursement_id` INT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(100) NULL,
  `file_size` INT UNSIGNED NULL,
  `attachment_type` ENUM('receipt', 'invoice', 'supporting_document', 'other') NOT NULL DEFAULT 'receipt',
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_reimbursement_id` (`reimbursement_id`),
  FOREIGN KEY (`reimbursement_id`) REFERENCES `reimbursements`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
