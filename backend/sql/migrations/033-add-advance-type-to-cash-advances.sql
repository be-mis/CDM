USE cdmdb;

ALTER TABLE cash_advances
ADD COLUMN advance_type VARCHAR(50) DEFAULT 'cash' AFTER status;
