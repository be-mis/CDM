USE cdmdb;
ALTER TABLE liquidation_items
ADD COLUMN destination VARCHAR(255) NULL AFTER particulars,
ADD COLUMN transport_from VARCHAR(255) NULL AFTER destination,
ADD COLUMN transport_to VARCHAR(255) NULL AFTER transport_from,
ADD COLUMN transport_mode VARCHAR(100) NULL AFTER transport_to;
