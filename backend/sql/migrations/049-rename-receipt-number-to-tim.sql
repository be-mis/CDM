USE `cdmdb`;

-- Rename column in liquidation_items
ALTER TABLE `liquidation_items` CHANGE COLUMN `receipt_number` `tim` VARCHAR(100) NULL;

-- Rename column in reimbursement_items
ALTER TABLE `reimbursement_items` CHANGE COLUMN `receipt_number` `tim` VARCHAR(100) NULL;

-- Rename column in liquidation_other_expenses if it exists
ALTER TABLE `liquidation_other_expenses` CHANGE COLUMN `receipt_number` `tim` VARCHAR(100) NULL;

-- Rename column in travel_other_expenses (if exists and has receipt_number, strictly speaking travel liquidation is now merged but the table might still exist or be used)
-- Checking 037-create-travel-liquidation-tables.sql might be useful but "liquidation_items" is the main one now used by the unified form.
-- However, previous turn I removed travel specific logic from frontend, but backend tables might still be there.
-- Let's check 037 content just in case.
