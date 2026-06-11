-- Migration 027: Create cash_advance_activities table and migrate existing single-activity data
USE `cdmdb`;

-- 1) Create normalized activities table
CREATE TABLE IF NOT EXISTS `cash_advance_activities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cash_advance_id` INT UNSIGNED NOT NULL,
  `destination` VARCHAR(255) NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cash_advance_id` (`cash_advance_id`),
  CONSTRAINT `fk_caa_cash_advance` FOREIGN KEY (`cash_advance_id`) REFERENCES `cash_advances`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Migrate existing single-row activity fields from cash_advances into the new table
-- Only insert when there isn't already an activity row for that cash_advance_id
INSERT INTO `cash_advance_activities` (`cash_advance_id`, `destination`, `start_date`, `end_date`, `created_at`, `updated_at`)
SELECT
  ca.id AS cash_advance_id,
  ca.destination,
  ca.start_date,
  ca.end_date,
  NOW() AS created_at,
  NOW() AS updated_at
FROM `cash_advances` ca
LEFT JOIN `cash_advance_activities` caa ON caa.cash_advance_id = ca.id
WHERE (ca.destination IS NOT NULL OR ca.start_date IS NOT NULL OR ca.end_date IS NOT NULL)
  AND caa.id IS NULL;

-- Notes:
-- * This migration creates the new table and migrates any existing destination/start_date/end_date
--   values into a single activity row per cash advance when those legacy fields are present.
-- * We intentionally do NOT DROP the legacy columns here to allow rollback and validation.
-- * After verifying the application and data, create a follow-up migration to remove
--   `destination`, `start_date`, and `end_date` columns from `cash_advances` if desired.
