-- Run this against cdmdb to add OTP support for signup + forgot-password.
-- One row per (email, purpose); a new send-otp request overwrites the previous
-- code for that email+purpose rather than piling up rows.

CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  purpose VARCHAR(20) NOT NULL,        -- 'signup' | 'reset'
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email_purpose (email, purpose)
);