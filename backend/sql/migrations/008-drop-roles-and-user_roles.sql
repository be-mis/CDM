-- Migration 008: drop user_roles and roles, remove role_id from users
USE `cdmdb`;

-- drop user_roles foreign keys then drop table
ALTER TABLE `user_roles` DROP FOREIGN KEY `fk_userroles_user`;
ALTER TABLE `user_roles` DROP FOREIGN KEY `fk_userroles_role`;
DROP TABLE IF EXISTS `user_roles`;

-- remove fk from users and drop column
ALTER TABLE `users` DROP FOREIGN KEY `fk_users_role`;
ALTER TABLE `users` DROP COLUMN `role_id`;

-- drop roles table
DROP TABLE IF EXISTS `roles`;
