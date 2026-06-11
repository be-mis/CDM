-- Add 'store' column to liquidation_transportation table (between date_covered and from_location)
ALTER TABLE liquidation_transportation
  ADD COLUMN store VARCHAR(255) NULL AFTER date_covered;
