USE `cdmdb`;

-- Rename column tim to tin in liquidation_items
ALTER TABLE `liquidation_items` CHANGE COLUMN `tim` `tin` VARCHAR(100) NULL;

-- Rename column tim to tin in reimbursement_items
ALTER TABLE `reimbursement_items` CHANGE COLUMN `tim` `tin` VARCHAR(100) NULL;

-- Rename column tim to tin in liquidation_other_expenses
ALTER TABLE `liquidation_other_expenses` CHANGE COLUMN `tim` `tin` VARCHAR(100) NULL;
