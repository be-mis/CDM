-- 009-create-departments.sql
-- Create departments table and seed initial department rows
USE `cdmdb`;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_departments_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `departments` (`name`) VALUES
  ('NBFI Sales'),
  ('NBFI Merchandising'),
  ('EPC Sales'),
  ('Finance'),
  ('Human Resource'),
  ('Marketing'),
  ('MIS'),
  ('Operations')
ON DUPLICATE KEY UPDATE `name` = `name`;
