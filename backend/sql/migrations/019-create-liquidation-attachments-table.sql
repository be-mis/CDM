-- Migration 019: Create liquidation attachments table
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `liquidation_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `liquidation_id` INT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(100) NULL,
  `file_size` INT UNSIGNED NULL,
  `attachment_type` ENUM('receipt', 'invoice', 'supporting_document', 'other') NOT NULL DEFAULT 'receipt',
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_liquidation_id` (`liquidation_id`),
  FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
