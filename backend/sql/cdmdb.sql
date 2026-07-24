-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 24, 2026 at 04:50 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cdmdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `approver`
--

CREATE TABLE `approver` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `department` enum('EPC Merchandising','EPC Sales','Finance','Human Resource','Marketing','MIS','NBFI Merchandising','NBFI Sales','Office of the President','Operations') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity` varchar(100) DEFAULT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_advances`
--

CREATE TABLE `cash_advances` (
  `id` int(10) UNSIGNED NOT NULL,
  `advance_number` varchar(50) NOT NULL,
  `advance_date` date NOT NULL,
  `requested_by` varchar(191) NOT NULL,
  `department_id` int(11) NOT NULL,
  `business_unit` varchar(50) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `purpose` text NOT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `requested_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `payment_method` enum('gcash','payroll') NOT NULL DEFAULT 'payroll',
  `account_number` varchar(100) DEFAULT NULL,
  `date_needed` date DEFAULT NULL,
  `date_coverage` varchar(255) DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','cancelled','released') DEFAULT 'draft',
  `advance_type` varchar(50) DEFAULT 'cash',
  `remarks` text DEFAULT NULL,
  `gcash_name` varchar(500) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approved_by` varchar(255) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `reject_remarks` text DEFAULT NULL,
  `disbursed_at` timestamp NULL DEFAULT NULL,
  `liquidated_at` timestamp NULL DEFAULT NULL,
  `liquidation_deadline` date DEFAULT NULL,
  `released_by` varchar(255) DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `release_remarks` text DEFAULT NULL,
  `funding_code` enum('ORF','ARF') DEFAULT NULL,
  `alert_sent_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_advance_attachments`
--

CREATE TABLE `cash_advance_attachments` (
  `id` int(10) UNSIGNED NOT NULL,
  `cash_advance_id` int(10) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_advance_breakdown`
--

CREATE TABLE `cash_advance_breakdown` (
  `id` int(10) UNSIGNED NOT NULL,
  `cash_advance_id` int(10) UNSIGNED NOT NULL,
  `description` varchar(500) NOT NULL,
  `no_of_days` int(11) NOT NULL DEFAULT 1,
  `estimated_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `created_at`) VALUES
(1, 'EPC Merchandising', '2026-01-19 09:03:27'),
(2, 'EPC Sales', '2025-12-11 11:39:39'),
(3, 'NBFI Sales', '2025-12-11 11:39:39'),
(4, 'NBFI Merchandising', '2025-12-11 11:39:39'),
(5, 'Finance', '2025-12-11 11:39:39'),
(6, 'Human Resource', '2025-12-11 11:39:39'),
(7, 'MIS', '2025-12-11 11:39:39'),
(8, 'Operations', '2025-12-11 11:39:39'),
(9, 'Office of the President', '2025-12-15 03:48:17'),
(10, 'Marketing', '2025-12-11 11:39:39'),
(11, 'Ecommerce', '2026-06-08 03:03:52');

-- --------------------------------------------------------

--
-- Table structure for table `liquidations`
--

CREATE TABLE `liquidations` (
  `id` int(10) UNSIGNED NOT NULL,
  `liquidation_number` varchar(50) NOT NULL,
  `liquidation_date` date NOT NULL,
  `cash_advance_id` int(10) UNSIGNED NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `submitted_by` varchar(191) NOT NULL,
  `department_id` int(11) NOT NULL,
  `business_unit` varchar(50) DEFAULT NULL,
  `total_advance_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_actual_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `variance` decimal(15,2) GENERATED ALWAYS AS (`total_advance_amount` - `total_actual_amount`) STORED,
  `refund_amount` decimal(15,2) DEFAULT NULL,
  `additional_payment` decimal(15,2) DEFAULT NULL,
  `payment_method` enum('gcash','payroll') DEFAULT NULL,
  `gcash_name` varchar(500) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','cancelled','released') DEFAULT 'draft',
  `created_by` varchar(100) DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_by_name` varchar(100) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `reject_remarks` text DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `previous_status` varchar(50) DEFAULT NULL,
  `released_by` varchar(100) DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `release_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liquidation_attachments`
--

CREATE TABLE `liquidation_attachments` (
  `id` int(10) UNSIGNED NOT NULL,
  `liquidation_id` int(10) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liquidation_expenses`
--

CREATE TABLE `liquidation_expenses` (
  `id` int(10) UNSIGNED NOT NULL,
  `liquidation_id` int(10) UNSIGNED NOT NULL,
  `expense_date` date DEFAULT NULL,
  `particular` varchar(100) NOT NULL,
  `actual_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `receipt_id` int(11) DEFAULT NULL,
  `receipt_number` varchar(20) NOT NULL,
  `tin` varchar(100) DEFAULT NULL,
  `vendor_name` varchar(50) DEFAULT NULL,
  `vat_type` enum('VAT','NonVAT') NOT NULL,
  `address` varchar(100) DEFAULT NULL,
  `vatable_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `zero_rated_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_exempt_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liquidation_itinerary`
--

CREATE TABLE `liquidation_itinerary` (
  `id` int(10) UNSIGNED NOT NULL,
  `liquidation_id` int(10) UNSIGNED NOT NULL,
  `travel_date` date NOT NULL,
  `store_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `receipt_id` int(11) DEFAULT NULL,
  `transport_from` varchar(100) DEFAULT NULL,
  `transport_to` varchar(100) DEFAULT NULL,
  `transport_mode` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liquidation_receipts`
--

CREATE TABLE `liquidation_receipts` (
  `id` int(10) NOT NULL,
  `liquidation_id` int(10) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  `source_id` int(10) DEFAULT NULL,
  `source_type` enum('expense','itinerary') DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `run_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otp_verifications`
--

CREATE TABLE `otp_verifications` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `purpose` varchar(20) NOT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `last_sent_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reimbursements`
--

CREATE TABLE `reimbursements` (
  `id` int(10) UNSIGNED NOT NULL,
  `reimbursement_number` varchar(50) NOT NULL,
  `submitted_by` varchar(191) NOT NULL,
  `department_id` int(11) NOT NULL,
  `business_unit` varchar(50) DEFAULT NULL,
  `reimbursement_date` date NOT NULL,
  `date_needed` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `total_actual_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_method` enum('gcash','payroll') DEFAULT NULL,
  `gcash_name` varchar(500) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','cancelled','released') DEFAULT 'draft',
  `created_by` varchar(100) DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_by_name` varchar(100) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `reject_remarks` text DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `previous_status` varchar(50) DEFAULT NULL,
  `released_by` varchar(100) DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `release_remarks` text DEFAULT NULL,
  `funding_code` enum('ORF','ARF') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reimbursement_attachments`
--

CREATE TABLE `reimbursement_attachments` (
  `id` int(10) UNSIGNED NOT NULL,
  `reimbursement_id` int(10) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reimbursement_expenses`
--

CREATE TABLE `reimbursement_expenses` (
  `id` int(10) UNSIGNED NOT NULL,
  `reimbursement_id` int(10) UNSIGNED NOT NULL,
  `expense_date` date DEFAULT NULL,
  `particular` varchar(100) NOT NULL,
  `actual_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `receipt_id` int(11) DEFAULT NULL,
  `receipt_number` varchar(20) NOT NULL,
  `tin` varchar(100) DEFAULT NULL,
  `vendor_name` varchar(50) DEFAULT NULL,
  `vat_type` enum('VAT','NonVAT') NOT NULL,
  `address` varchar(100) DEFAULT NULL,
  `vatable_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `zero_rated_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_exempt_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reimbursement_itinerary`
--

CREATE TABLE `reimbursement_itinerary` (
  `id` int(10) UNSIGNED NOT NULL,
  `reimbursement_id` int(10) UNSIGNED NOT NULL,
  `travel_date` date NOT NULL,
  `store_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `receipt_id` int(11) DEFAULT NULL,
  `transport_from` varchar(100) DEFAULT NULL,
  `transport_to` varchar(100) DEFAULT NULL,
  `transport_mode` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reimbursement_receipts`
--

CREATE TABLE `reimbursement_receipts` (
  `id` int(10) NOT NULL,
  `reimbursement_id` int(10) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  `source_id` int(10) DEFAULT NULL,
  `source_type` enum('expense','itinerary') DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `revolving_funds`
--

CREATE TABLE `revolving_funds` (
  `id` int(10) UNSIGNED NOT NULL,
  `department` int(11) NOT NULL,
  `funding_code` varchar(5) NOT NULL,
  `funding_description` varchar(50) NOT NULL,
  `Amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `revolving_funds`
--

INSERT INTO `revolving_funds` (`id`, `department`, `funding_code`, `funding_description`, `Amount`, `created_at`, `updated_at`) VALUES
(1, 5, 'ARF', 'Accounting Revolving Fund', 10000.00, '2026-07-13 06:16:40', '2026-07-24 02:46:44'),
(2, 8, 'ORF', 'Operations Revolving Fund', 10000.00, '2026-07-13 06:16:40', '2026-07-24 02:46:48');

-- --------------------------------------------------------

--
-- Table structure for table `revolving_funds_history`
--

CREATE TABLE `revolving_funds_history` (
  `id` int(10) UNSIGNED NOT NULL,
  `transaction_type` enum('cash_advance','reimbursement','replenish') NOT NULL,
  `transaction_id` int(10) UNSIGNED NOT NULL COMMENT 'FK to cash_advances.id or reimbursements.id, depending on transaction_type',
  `transaction_number` varchar(50) NOT NULL COMMENT 'advance_number or reimbursement_number',
  `revolving_fund_id` int(10) UNSIGNED NOT NULL COMMENT 'FK to revolving_funds.id',
  `funding_code` varchar(5) NOT NULL COMMENT 'Denormalized copy of revolving_funds.funding_code at time of transaction, e.g. ORF',
  `total_amount` decimal(15,2) NOT NULL COMMENT 'Total requested amount of the approved request',
  `deducted_amount` decimal(15,2) NOT NULL COMMENT 'Amount actually deducted from the fund',
  `replenish_amount` decimal(15,2) DEFAULT NULL,
  `balance_before` decimal(15,2) NOT NULL COMMENT 'Fund balance before this deduction',
  `balance_after` decimal(15,2) NOT NULL COMMENT 'Fund balance after this deduction',
  `remarks` varchar(50) DEFAULT NULL,
  `approver_id` int(10) UNSIGNED NOT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `uploads`
--

CREATE TABLE `uploads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `original_name` varchar(255) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `path` varchar(512) NOT NULL,
  `mimetype` varchar(100) DEFAULT NULL,
  `size` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(191) DEFAULT '',
  `email` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('employee','supervisor','manager','vp','president','admin','accounting') DEFAULT NULL,
  `business_unit` enum('NBFI','EPC') DEFAULT NULL,
  `department` enum('EPC MERCHANDISING','EPC SALES','NBFI MERCHANDISING','NBFI SALES','FINANCE','HUMAN RESOURCE','MARKETING','MIS','OPERATIONS','OFFICE OF THE PRESIDENT') DEFAULT NULL,
  `payroll_account` varchar(50) DEFAULT NULL,
  `gcash_number` varchar(20) DEFAULT NULL,
  `gcash_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `business_unit`, `department`, `payroll_account`, `gcash_number`, `gcash_name`, `is_active`, `created_at`, `updated_at`, `reset_token`, `reset_token_expires`) VALUES
(1, 'MIS Approver', 'misapprover@dummy.com', '$2a$10$jdB8Yr6X4HDc/66cf5bMtOA4MVt6V/.J2HwUCt9FoJs89F8t4HYX.', 'manager', 'NBFI', 'MIS', '0112-1225-00032', '09102030456', 'MIS Approver', 1, '2025-12-12 08:09:08', '2026-07-17 03:35:23', '00b312c9471010e0365f30fabf77b3511cfc26d942c7bde9e8d32e245f121fad', '2025-12-15 06:21:19'),
(2, 'Admin Dummy', 'admin@dummy.com', '$2a$10$qn1r6hpWFQkSYWpKtciyFOonv3hnS07KomsXcZmmLmG091aaB2g5e', 'admin', 'NBFI', 'MIS', '0392365625', '091326532983', 'Admin Account', 1, '2025-12-15 03:41:08', '2026-07-15 02:42:21', NULL, NULL),
(3, 'Accounting Dummy', 'accounting@dummy.com', '$2a$10$Znz07v.h.vI8IhtKhto7Pen1fzlDkDhE9HsbOEd9VOIfM42oD/clC', 'accounting', 'EPC', 'FINANCE', '0392365625', '091326532983', 'EPC Roland Alavera', 1, '2025-12-15 03:47:57', '2026-07-15 02:42:12', NULL, NULL),
(4, 'Requestor Dummy', 'requestor@dummy.com', '$2a$10$aFn2DhBmY3eUGYCuOIfaPu0HeDI90JxNFkgM1TKmJvqUAb9..pyZ2', 'employee', 'NBFI', 'OPERATIONS', '000-1245-55455', '09103459681', 'Roland Alavera', 1, '2025-12-15 05:27:53', '2026-07-20 07:35:18', 'de95dae62f93387540cc9f635a9763eb58a0135fc21c694c6ca66d9ad23be828', '2026-07-07 12:04:16'),
(5, 'Approver Dummy', 'approver@dummy.com', '$2a$10$KaiC7DnKJ3jluHqtBjrFYuVL.0imBLULAtyGgVyURWk3HtC.NM/bq', 'manager', 'NBFI', 'OPERATIONS', '091231763', '09103213123', 'Mike Approver', 1, '2026-01-19 09:25:31', '2026-07-15 02:42:33', NULL, NULL),
(9, 'Accounting Approver', 'accountingapprover@dummy.com', '$2a$10$Q/8.M3ZDr530jafaYB.8le7DW8D.pDG8Io7sNWoJBeGZz95Q6pYvG', 'accounting', 'NBFI', 'FINANCE', '54454552245', '09245036512', 'Accounting Approver', 1, '2026-07-23 03:01:09', '2026-07-23 03:01:52', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `approver`
--
ALTER TABLE `approver`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_user` (`user_id`);

--
-- Indexes for table `cash_advances`
--
ALTER TABLE `cash_advances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `advance_number` (`advance_number`),
  ADD KEY `idx_advance_number` (`advance_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `cash_advance_attachments`
--
ALTER TABLE `cash_advance_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cash_advance_id` (`cash_advance_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `cash_advance_breakdown`
--
ALTER TABLE `cash_advance_breakdown`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cash_advance_id` (`cash_advance_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_departments_name` (`name`);

--
-- Indexes for table `liquidations`
--
ALTER TABLE `liquidations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `liquidation_number` (`liquidation_number`),
  ADD KEY `idx_liquidation_number` (`liquidation_number`),
  ADD KEY `idx_cash_advance_id` (`cash_advance_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_department_id` (`department_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `liquidation_attachments`
--
ALTER TABLE `liquidation_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_liquidation_id` (`liquidation_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `liquidation_expenses`
--
ALTER TABLE `liquidation_expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_liquidation_id` (`liquidation_id`);

--
-- Indexes for table `liquidation_itinerary`
--
ALTER TABLE `liquidation_itinerary`
  ADD PRIMARY KEY (`id`),
  ADD KEY `liquidation_id` (`liquidation_id`);

--
-- Indexes for table `liquidation_receipts`
--
ALTER TABLE `liquidation_receipts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `liquidation_id` (`liquidation_id`),
  ADD KEY `source_id` (`source_id`,`source_type`),
  ADD KEY `idx_liquidation_id` (`liquidation_id`),
  ADD KEY `idx_source` (`source_type`,`source_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `u_name` (`name`);

--
-- Indexes for table `otp_verifications`
--
ALTER TABLE `otp_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_email_purpose` (`email`,`purpose`);

--
-- Indexes for table `reimbursements`
--
ALTER TABLE `reimbursements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `department_id` (`department_id`),
  ADD KEY `status` (`status`,`created_by`,`approved_by`);

--
-- Indexes for table `reimbursement_attachments`
--
ALTER TABLE `reimbursement_attachments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reimbursement_expenses`
--
ALTER TABLE `reimbursement_expenses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reimbursement_itinerary`
--
ALTER TABLE `reimbursement_itinerary`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reimbursement_receipts`
--
ALTER TABLE `reimbursement_receipts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `revolving_funds`
--
ALTER TABLE `revolving_funds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `department` (`department`);

--
-- Indexes for table `revolving_funds_history`
--
ALTER TABLE `revolving_funds_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `revolving_fund_id` (`revolving_fund_id`),
  ADD KEY `approver_id` (`approver_id`),
  ADD KEY `transaction_lookup` (`transaction_type`,`transaction_id`);

--
-- Indexes for table `uploads`
--
ALTER TABLE `uploads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_upload_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `approver`
--
ALTER TABLE `approver`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_advances`
--
ALTER TABLE `cash_advances`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_advance_attachments`
--
ALTER TABLE `cash_advance_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_advance_breakdown`
--
ALTER TABLE `cash_advance_breakdown`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `liquidations`
--
ALTER TABLE `liquidations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liquidation_attachments`
--
ALTER TABLE `liquidation_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liquidation_expenses`
--
ALTER TABLE `liquidation_expenses`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liquidation_itinerary`
--
ALTER TABLE `liquidation_itinerary`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liquidation_receipts`
--
ALTER TABLE `liquidation_receipts`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otp_verifications`
--
ALTER TABLE `otp_verifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reimbursements`
--
ALTER TABLE `reimbursements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reimbursement_attachments`
--
ALTER TABLE `reimbursement_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reimbursement_expenses`
--
ALTER TABLE `reimbursement_expenses`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reimbursement_itinerary`
--
ALTER TABLE `reimbursement_itinerary`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reimbursement_receipts`
--
ALTER TABLE `reimbursement_receipts`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `revolving_funds`
--
ALTER TABLE `revolving_funds`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `revolving_funds_history`
--
ALTER TABLE `revolving_funds_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `uploads`
--
ALTER TABLE `uploads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cash_advances`
--
ALTER TABLE `cash_advances`
  ADD CONSTRAINT `cash_advances_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);

--
-- Constraints for table `cash_advance_attachments`
--
ALTER TABLE `cash_advance_attachments`
  ADD CONSTRAINT `cash_advance_attachments_ibfk_1` FOREIGN KEY (`cash_advance_id`) REFERENCES `cash_advances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cash_advance_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cash_advance_breakdown`
--
ALTER TABLE `cash_advance_breakdown`
  ADD CONSTRAINT `cash_advance_breakdown_ibfk_1` FOREIGN KEY (`cash_advance_id`) REFERENCES `cash_advances` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `liquidations`
--
ALTER TABLE `liquidations`
  ADD CONSTRAINT `liquidations_ibfk_1` FOREIGN KEY (`cash_advance_id`) REFERENCES `cash_advances` (`id`),
  ADD CONSTRAINT `liquidations_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);

--
-- Constraints for table `liquidation_attachments`
--
ALTER TABLE `liquidation_attachments`
  ADD CONSTRAINT `liquidation_attachments_ibfk_1` FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `liquidation_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `liquidation_expenses`
--
ALTER TABLE `liquidation_expenses`
  ADD CONSTRAINT `liquidation_expenses_ibfk_1` FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `liquidation_itinerary`
--
ALTER TABLE `liquidation_itinerary`
  ADD CONSTRAINT `liquidation_itinerary_ibfk_1` FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `liquidation_receipts`
--
ALTER TABLE `liquidation_receipts`
  ADD CONSTRAINT `fk_lr_liquidation` FOREIGN KEY (`liquidation_id`) REFERENCES `liquidations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `revolving_funds_history`
--
ALTER TABLE `revolving_funds_history`
  ADD CONSTRAINT `fk_rfh_approver` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_rfh_revolving_fund` FOREIGN KEY (`revolving_fund_id`) REFERENCES `revolving_funds` (`id`);

--
-- Constraints for table `uploads`
--
ALTER TABLE `uploads`
  ADD CONSTRAINT `fk_uploads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
