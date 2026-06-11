-- Migration 007: add role_id to users and FK to roles
USE `cdmdb`;

ALTER TABLE `users`
  ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `password`;

ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL;

-- set existing users to 'user' role if present
UPDATE `users` u
JOIN `roles` r ON r.name = 'user'
SET u.role_id = r.id
WHERE u.role_id IS NULL;
