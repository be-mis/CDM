-- Migration 023: Drop disbursement tables
USE `cdmdb`;

DROP TABLE IF EXISTS `disbursement_attachments`;
DROP TABLE IF EXISTS `disbursement_line_items`;
DROP TABLE IF EXISTS `disbursements`;
