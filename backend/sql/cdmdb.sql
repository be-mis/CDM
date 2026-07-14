-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 14, 2026 at 11:54 AM
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

--
-- Dumping data for table `approver`
--

INSERT INTO `approver` (`id`, `name`, `email`, `department`, `created_at`) VALUES
(41, 'Approver Dummy', 'approver@dummy.com', 'Operations', '2026-07-13 07:37:22');

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

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity`, `entity_id`, `details`, `ip`, `created_at`) VALUES
(1, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.153', '2026-03-31 06:20:51'),
(2, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.153', '2026-03-31 06:21:27'),
(3, 4, 'login_failed', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.0.153', '2026-03-31 07:12:54'),
(4, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.153', '2026-03-31 07:13:01'),
(5, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.153', '2026-03-31 07:19:37'),
(6, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-02 07:28:04'),
(7, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-02 07:28:25'),
(8, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-02 07:31:55'),
(9, 4, 'delete_liquidation', 'liquidations', '27', '{\"status\":\"draft\"}', '192.168.1.112', '2026-06-02 07:32:57'),
(10, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-03 02:30:32'),
(11, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-03 06:52:49'),
(12, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-03 06:55:53'),
(13, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-03 06:59:37'),
(14, 4, 'create_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:29:46'),
(15, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:33:34'),
(16, 4, 'add_attachment', 'cash_advance_attachments', '58', '{\"cashAdvanceId\":\"32\",\"fileName\":\"CDM Flowchart.png\",\"fileType\":\"image/png\",\"fileSize\":241098}', '192.168.1.112', '2026-06-03 07:33:34'),
(17, 4, 'add_attachment', 'cash_advance_attachments', '59', '{\"cashAdvanceId\":\"32\",\"fileName\":\"EPC SAMPLE REIM LIQ.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":1194517}', '192.168.1.112', '2026-06-03 07:33:34'),
(18, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:33:37'),
(19, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:35:07'),
(20, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:37:19'),
(21, 4, 'delete_attachment', 'cash_advance_attachments', '58', '{\"cashAdvanceId\":\"32\",\"fileName\":\"CDM Flowchart.png\",\"fileType\":\"image/png\",\"fileSize\":241098,\"filePath\":\"/uploads/cash-advances/CA-202606-5270/1780472014338-CDM_Flowchart.png\"}', '192.168.1.112', '2026-06-03 07:37:19'),
(22, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:53:42'),
(23, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:53:47'),
(24, 4, 'update_cash_advance', 'cash_advances', '32', '{\"advanceNumber\":\"CA-202606-5270\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:54:22'),
(25, 4, 'delete_cash_advance', 'cash_advances', '32', '{\"status\":\"draft\"}', '192.168.1.112', '2026-06-03 07:54:30'),
(26, 4, 'create_cash_advance', 'cash_advances', '33', '{\"advanceNumber\":\"CA-202606-4963\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:55:22'),
(27, 4, 'add_attachment', 'cash_advance_attachments', '60', '{\"cashAdvanceId\":\"33\",\"fileName\":\"SAMPLE REIM LIQ WITH OTHER EXPENSES.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":1082568}', '192.168.1.112', '2026-06-03 07:55:22'),
(28, 4, 'update_cash_advance', 'cash_advances', '33', '{\"advanceNumber\":\"CA-202606-4963\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:55:26'),
(29, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.112', '2026-06-03 07:56:13'),
(30, 4, 'create_cash_advance', 'cash_advances', '34', '{\"advanceNumber\":\"CA-202606-7980\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:57:22'),
(31, 4, 'update_cash_advance', 'cash_advances', '34', '{\"advanceNumber\":\"CA-202606-7980\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 07:57:32'),
(32, 4, 'create_cash_advance', 'cash_advances', '35', '{\"advanceNumber\":\"CA-202606-1443\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 08:43:39'),
(33, 4, 'create_cash_advance', 'cash_advances', '36', '{\"advanceNumber\":\"CA-202606-8912\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 08:59:17'),
(34, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-03 08:59:50'),
(35, 4, 'update_cash_advance', 'cash_advances', '36', '{\"advanceNumber\":\"CA-202606-8912\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 09:00:04'),
(36, 4, 'create_cash_advance', 'cash_advances', '37', '{\"advanceNumber\":\"CA-202606-7212\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.112', '2026-06-03 09:10:28'),
(37, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-05 03:15:17'),
(38, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-05 03:22:37'),
(39, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-05 03:23:27'),
(40, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.112', '2026-06-05 08:12:12'),
(41, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.197', '2026-06-08 02:21:46'),
(42, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.197', '2026-06-08 10:27:29'),
(43, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-09 02:02:12'),
(44, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-09 02:36:33'),
(45, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.179', '2026-06-09 03:00:39'),
(46, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.179', '2026-06-09 03:13:07'),
(47, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-09 03:31:40'),
(48, 4, 'create_cash_advance', 'cash_advances', '40', '{\"advanceNumber\":\"CA-202606-0441\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.243', '2026-06-09 08:16:24'),
(49, 4, 'update_cash_advance', 'cash_advances', '40', '{\"advanceNumber\":\"CA-202606-0441\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.243', '2026-06-09 08:17:19'),
(50, 4, 'update_cash_advance', 'cash_advances', '40', '{\"advanceNumber\":\"CA-202606-0441\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.243', '2026-06-09 08:17:42'),
(51, 4, 'cancel_cash_advance', 'cash_advances', '40', '{\"previousStatus\":\"pending\"}', '192.168.1.243', '2026-06-09 08:22:04'),
(52, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-09 08:41:35'),
(53, 4, 'update_cash_advance', 'cash_advances', '40', '{\"advanceNumber\":\"CA-202606-0441\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.243', '2026-06-09 08:47:39'),
(54, 4, 'add_attachment', 'cash_advance_attachments', '61', '{\"cashAdvanceId\":\"40\",\"fileName\":\"7-11.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":2592643}', '192.168.1.243', '2026-06-09 08:47:39'),
(55, 4, 'add_attachment', 'cash_advance_attachments', '62', '{\"cashAdvanceId\":\"40\",\"fileName\":\"LAWSON.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":9022302}', '192.168.1.243', '2026-06-09 08:47:39'),
(56, 4, 'add_attachment', 'cash_advance_attachments', '63', '{\"cashAdvanceId\":\"40\",\"fileName\":\"Scanned 7-11.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":6467930}', '192.168.1.243', '2026-06-09 08:47:39'),
(57, 4, 'add_attachment', 'cash_advance_attachments', '64', '{\"cashAdvanceId\":\"40\",\"fileName\":\"Scanned LAWSON.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":8072397}', '192.168.1.243', '2026-06-09 08:47:39'),
(58, 4, 'delete_cash_advance', 'cash_advances', '37', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-09 08:48:10'),
(59, 4, 'delete_cash_advance', 'cash_advances', '40', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-09 08:48:38'),
(60, 4, 'cancel_cash_advance', 'cash_advances', '36', '{\"previousStatus\":\"pending\"}', '192.168.1.243', '2026-06-09 08:52:50'),
(61, 4, 'update_cash_advance', 'cash_advances', '36', '{\"advanceNumber\":\"CA-202606-8912\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.1.243', '2026-06-09 08:52:55'),
(62, 4, 'delete_cash_advance', 'cash_advances', '36', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-09 08:52:59'),
(63, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-10 01:14:44'),
(64, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-10 01:33:27'),
(65, 4, 'create_liquidation', 'liquidations', '32', '{\"liquidationNumber\":\"CL-202606-5111\",\"cashAdvanceId\":31,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-10 02:26:07'),
(66, 4, 'add_attachment', 'liquidation_attachments', '18', '{\"liquidationId\":\"32\",\"fileName\":\"CDM Flowchart.png\",\"fileType\":\"image/png\",\"fileSize\":241098}', '192.168.1.243', '2026-06-10 02:26:07'),
(67, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-10 05:50:19'),
(68, 4, 'create_liquidation', 'liquidations', '33', '{\"liquidationNumber\":\"CL-202606-8935\",\"cashAdvanceId\":30,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-10 05:56:51'),
(69, 4, 'delete_liquidation', 'liquidations', '33', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-10 06:00:25'),
(70, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-10 06:00:46'),
(71, 4, 'create_liquidation', 'liquidations', '34', '{\"liquidationNumber\":\"CL-202606-5777\",\"cashAdvanceId\":30,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-10 06:24:13'),
(72, 4, 'update_liquidation', 'liquidations', '34', '{\"liquidationNumber\":\"CL-202606-5777\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-10 06:24:13'),
(73, 4, 'add_attachment', 'liquidation_attachments', '19', '{\"liquidationId\":\"34\",\"fileName\":\"7-11.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":2592643}', '192.168.1.243', '2026-06-10 06:24:13'),
(74, 4, 'add_attachment', 'liquidation_attachments', '20', '{\"liquidationId\":\"34\",\"fileName\":\"LAWSON.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":9022302}', '192.168.1.243', '2026-06-10 06:24:13'),
(75, 4, 'update_liquidation', 'liquidations', '34', '{\"liquidationNumber\":\"CL-202606-5777\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-10 07:57:52'),
(76, 4, 'update_liquidation', 'liquidations', '34', '{\"liquidationNumber\":\"CL-202606-5777\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-10 08:44:11'),
(77, 4, 'login_failed', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.1.243', '2026-06-11 01:50:16'),
(78, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-11 01:50:21'),
(79, 4, 'delete_liquidation', 'liquidations', '32', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 02:47:06'),
(80, 4, 'delete_liquidation', 'liquidations', '34', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 02:47:07'),
(81, 4, 'create_liquidation', 'liquidations', '35', '{\"liquidationNumber\":\"CL-202606-5961\",\"cashAdvanceId\":31,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-11 02:50:01'),
(82, 4, 'update_liquidation', 'liquidations', '35', '{\"liquidationNumber\":\"CL-202606-5961\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 02:50:01'),
(83, 4, 'update_liquidation', 'liquidations', '35', '{\"liquidationNumber\":\"CL-202606-5961\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 02:52:14'),
(84, 4, 'delete_liquidation', 'liquidations', '35', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 03:11:45'),
(85, 4, 'create_liquidation', 'liquidations', '36', '{\"liquidationNumber\":\"CL-202606-3341\",\"cashAdvanceId\":30,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-11 03:15:21'),
(86, 4, 'update_liquidation', 'liquidations', '36', '{\"liquidationNumber\":\"CL-202606-3341\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 03:15:21'),
(87, 4, 'update_liquidation', 'liquidations', '36', '{\"liquidationNumber\":\"CL-202606-3341\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 03:16:56'),
(88, 4, 'add_attachment', 'liquidation_attachments', '21', '{\"liquidationId\":\"36\",\"fileName\":\"SAP Error.png\",\"fileType\":\"image/png\",\"fileSize\":130287}', '192.168.1.243', '2026-06-11 03:16:56'),
(89, 4, 'add_attachment', 'liquidation_attachments', '22', '{\"liquidationId\":\"36\",\"fileName\":\"DEACTIVATION OF STOP CST.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":152603}', '192.168.1.243', '2026-06-11 03:16:56'),
(90, 4, 'create_liquidation', 'liquidations', '37', '{\"liquidationNumber\":\"CL-202606-2799\",\"cashAdvanceId\":31,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-11 04:00:46'),
(91, 4, 'delete_liquidation', 'liquidations', '37', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 04:01:15'),
(92, 4, 'delete_liquidation', 'liquidations', '36', '{\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 05:14:05'),
(93, 4, 'create_liquidation', 'liquidations', '38', '{\"liquidationNumber\":\"CL-202606-0203\",\"cashAdvanceId\":30,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.1.243', '2026-06-11 05:25:20'),
(94, 4, 'update_liquidation', 'liquidations', '38', '{\"liquidationNumber\":\"CL-202606-0203\",\"status\":\"draft\"}', '192.168.1.243', '2026-06-11 05:25:21'),
(95, 4, 'add_attachment', 'liquidation_attachments', '23', '{\"liquidationId\":\"38\",\"fileName\":\"DEACTIVATION OF STOP CST.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":152603}', '192.168.1.243', '2026-06-11 05:25:21'),
(96, 4, 'add_attachment', 'liquidation_attachments', '24', '{\"liquidationId\":\"38\",\"fileName\":\"Copy of BP-GD-005.00- Business Partner Master Data Update Requisition Form (1).pdf\",\"fileType\":\"application/pdf\",\"fileSize\":287666}', '192.168.1.243', '2026-06-11 05:25:21'),
(97, 4, 'cancel_cash_advance', 'cash_advances', '34', '{\"previousStatus\":\"pending\"}', '192.168.1.243', '2026-06-11 05:48:36'),
(98, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-11 06:28:21'),
(99, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-11 06:52:21'),
(100, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.243', '2026-06-11 09:51:25'),
(101, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-15 01:59:35'),
(102, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-15 02:05:55'),
(103, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-06-15 02:11:17'),
(104, 4, 'update_liquidation', 'liquidations', '38', '{\"liquidationNumber\":\"CL-202606-0203\",\"status\":\"draft\"}', '192.168.0.107', '2026-06-15 02:30:39'),
(105, 4, 'update_liquidation', 'liquidations', '38', '{\"liquidationNumber\":\"CL-202606-0203\",\"status\":\"draft\"}', '192.168.0.107', '2026-06-15 02:30:39'),
(106, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-15 05:30:11'),
(107, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-15 05:31:56'),
(108, 4, 'update_cash_advance', 'cash_advances', '34', '{\"advanceNumber\":\"CA-202606-7980\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-15 05:41:07'),
(109, 4, 'create_liquidation', 'liquidations', '39', '{\"liquidationNumber\":\"CL-202606-5388\",\"cashAdvanceId\":30,\"status\":\"draft\",\"advanceType\":\"cash\"}', '192.168.0.107', '2026-06-15 05:46:37'),
(110, 4, 'update_liquidation', 'liquidations', '39', '{\"liquidationNumber\":\"CL-202606-5388\",\"status\":\"draft\"}', '192.168.0.107', '2026-06-15 05:46:38'),
(111, 4, 'add_attachment', 'liquidation_attachments', '25', '{\"liquidationId\":\"39\",\"fileName\":\"ACTIVATION OF STOP CST.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":80974}', '192.168.0.107', '2026-06-15 05:46:38'),
(112, 4, 'add_attachment', 'liquidation_attachments', '26', '{\"liquidationId\":\"39\",\"fileName\":\"Scanned Document 7.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":518841}', '192.168.0.107', '2026-06-15 05:46:38'),
(113, 4, 'add_attachment', 'liquidation_attachments', '27', '{\"liquidationId\":\"39\",\"fileName\":\"Scanned Document_page-0001.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":8072397}', '192.168.0.107', '2026-06-15 05:46:38'),
(114, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-15 07:07:46'),
(115, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-15 08:15:12'),
(116, 4, 'update_cash_advance', 'cash_advances', '34', '{\"advanceNumber\":\"CA-202606-7980\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-15 09:23:27'),
(117, 4, 'update_cash_advance', 'cash_advances', '34', '{\"advanceNumber\":\"CA-202606-7980\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-15 09:40:08'),
(118, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-16 01:01:49'),
(119, 4, 'login_failed', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.0.107', '2026-06-16 03:19:33'),
(120, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-16 03:19:37'),
(121, 4, 'login_failed', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.0.107', '2026-06-17 01:56:13'),
(122, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-17 01:56:24'),
(123, 4, 'update_liquidation', 'liquidations', '39', '{\"liquidationNumber\":\"CL-202606-5388\",\"status\":\"draft\"}', '192.168.0.107', '2026-06-17 07:12:26'),
(124, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-18 02:17:45'),
(125, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-18 02:34:10'),
(126, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.107', '2026-06-18 02:34:57'),
(127, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.107', '2026-06-18 02:38:56'),
(128, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.107', '2026-06-18 03:05:58'),
(129, 4, 'create_cash_advance', 'cash_advances', '41', '{\"advanceNumber\":\"CA-202606-6430\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 03:55:01'),
(130, 4, 'add_attachment', 'cash_advance_attachments', '65', '{\"cashAdvanceId\":\"41\",\"fileName\":\"Cash Advance Request JPEG.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":98844}', '192.168.0.107', '2026-06-18 03:55:01'),
(131, 4, 'add_attachment', 'cash_advance_attachments', '66', '{\"cashAdvanceId\":\"41\",\"fileName\":\"Cash Advance Request PDF.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":23557}', '192.168.0.107', '2026-06-18 03:55:01'),
(132, 4, 'update_cash_advance', 'cash_advances', '41', '{\"advanceNumber\":\"CA-202606-6430\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:21:37'),
(133, 4, 'create_cash_advance', 'cash_advances', '42', '{\"advanceNumber\":\"CA-202606-4966\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:29:39'),
(134, 4, 'update_cash_advance', 'cash_advances', '42', '{\"advanceNumber\":\"CA-202606-4966\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:39:03'),
(135, 4, 'update_cash_advance', 'cash_advances', '41', '{\"advanceNumber\":\"CA-202606-6430\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:46:44'),
(136, 4, 'update_cash_advance', 'cash_advances', '41', '{\"advanceNumber\":\"CA-202606-6430\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:46:51'),
(137, 4, 'create_cash_advance', 'cash_advances', '43', '{\"advanceNumber\":\"CA-202606-9457\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:48:00'),
(138, 4, 'add_attachment', 'cash_advance_attachments', '67', '{\"cashAdvanceId\":\"43\",\"fileName\":\"Cash Advance Request JPEG.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":98844}', '192.168.0.107', '2026-06-18 05:48:00'),
(139, 4, 'add_attachment', 'cash_advance_attachments', '68', '{\"cashAdvanceId\":\"43\",\"fileName\":\"Cash Advance Request PDF.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":23557}', '192.168.0.107', '2026-06-18 05:48:00'),
(140, 4, 'update_cash_advance', 'cash_advances', '43', '{\"advanceNumber\":\"CA-202606-9457\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:48:32'),
(141, 4, 'update_cash_advance', 'cash_advances', '43', '{\"advanceNumber\":\"CA-202606-9457\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 05:48:49'),
(142, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.107', '2026-06-18 05:49:57'),
(143, 4, 'create_cash_advance', 'cash_advances', '44', '{\"advanceNumber\":\"CA-202606-7133\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 06:05:29'),
(144, 4, 'update_cash_advance', 'cash_advances', '44', '{\"advanceNumber\":\"CA-202606-7133\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.107', '2026-06-18 06:05:37'),
(145, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-22 02:06:02'),
(146, 4, 'login_failed', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.0.110', '2026-06-22 06:48:10'),
(147, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-22 06:48:16'),
(148, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-22 08:03:47'),
(149, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-22 08:56:55'),
(150, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-22 10:48:37'),
(151, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-23 01:25:21'),
(152, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-23 02:40:27'),
(153, 3, 'login_failed', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"reason\":\"incorrect_password\"}', '192.168.0.110', '2026-06-23 03:09:59'),
(154, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-23 03:10:06'),
(155, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-23 03:10:17'),
(156, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-23 06:54:24'),
(157, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-23 06:55:04'),
(158, 4, 'update_cash_advance', 'cash_advances', '42', '{\"advanceNumber\":\"CA-202606-4966\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-23 07:35:15'),
(159, 4, 'update_cash_advance', 'cash_advances', '43', '{\"advanceNumber\":\"CA-202606-9457\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-23 07:36:22'),
(160, 4, 'update_cash_advance', 'cash_advances', '41', '{\"advanceNumber\":\"CA-202606-6430\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-23 08:02:27'),
(161, 4, 'update_cash_advance', 'cash_advances', '44', '{\"advanceNumber\":\"CA-202606-7133\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-23 09:02:29'),
(162, 4, 'update_cash_advance', 'cash_advances', '44', '{\"advanceNumber\":\"CA-202606-7133\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-23 09:02:52'),
(163, 4, 'update_cash_advance', 'cash_advances', '44', '{\"advanceNumber\":\"CA-202606-7133\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-23 09:03:11'),
(164, 4, 'add_attachment', 'cash_advance_attachments', '69', '{\"cashAdvanceId\":\"44\",\"fileName\":\"Scanned DUNKIN.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":2001120}', '192.168.0.110', '2026-06-23 09:03:11'),
(165, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-24 03:40:08'),
(166, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-24 05:57:06'),
(167, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-24 05:57:15'),
(168, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-24 06:08:08'),
(169, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-24 06:23:25'),
(170, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-25 01:42:30'),
(171, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-25 01:57:08'),
(172, 4, 'create_cash_advance', 'cash_advances', '45', '{\"advanceNumber\":\"CA-202606-5560\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 01:58:25'),
(173, 4, 'add_attachment', 'cash_advance_attachments', '70', '{\"cashAdvanceId\":\"45\",\"fileName\":\"BP-GD-005.00- (LCC LEGASPI).pdf\",\"fileType\":\"application/pdf\",\"fileSize\":179134}', '192.168.0.110', '2026-06-25 01:58:25'),
(174, 4, 'create_cash_advance', 'cash_advances', '46', '{\"advanceNumber\":\"CA-202606-4190\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 01:59:54'),
(175, 4, 'add_attachment', 'cash_advance_attachments', '71', '{\"cashAdvanceId\":\"46\",\"fileName\":\"1.png\",\"fileType\":\"image/png\",\"fileSize\":163109}', '192.168.0.110', '2026-06-25 01:59:54'),
(176, 4, 'add_attachment', 'cash_advance_attachments', '72', '{\"cashAdvanceId\":\"46\",\"fileName\":\"2.png\",\"fileType\":\"image/png\",\"fileSize\":140777}', '192.168.0.110', '2026-06-25 01:59:54'),
(177, 4, 'add_attachment', 'cash_advance_attachments', '73', '{\"cashAdvanceId\":\"46\",\"fileName\":\"3.png\",\"fileType\":\"image/png\",\"fileSize\":128920}', '192.168.0.110', '2026-06-25 01:59:54'),
(178, 4, 'add_attachment', 'cash_advance_attachments', '74', '{\"cashAdvanceId\":\"46\",\"fileName\":\"4.png\",\"fileType\":\"image/png\",\"fileSize\":148998}', '192.168.0.110', '2026-06-25 01:59:54'),
(179, 4, 'create_cash_advance', 'cash_advances', '47', '{\"advanceNumber\":\"CA-202606-5184\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 02:00:40'),
(180, 4, 'add_attachment', 'cash_advance_attachments', '75', '{\"cashAdvanceId\":\"47\",\"fileName\":\"Gmail - Your GrabExpress Receipt.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":242566}', '192.168.0.110', '2026-06-25 02:00:40'),
(181, 4, 'create_cash_advance', 'cash_advances', '48', '{\"advanceNumber\":\"CA-202606-9578\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 02:01:26'),
(182, 4, 'add_attachment', 'cash_advance_attachments', '76', '{\"cashAdvanceId\":\"48\",\"fileName\":\"sample.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":119986}', '192.168.0.110', '2026-06-25 02:01:26'),
(183, 4, 'add_attachment', 'cash_advance_attachments', '77', '{\"cashAdvanceId\":\"48\",\"fileName\":\"BP-GD-005.00- (LCC LEGASPI).pdf\",\"fileType\":\"application/pdf\",\"fileSize\":179134}', '192.168.0.110', '2026-06-25 02:01:26'),
(184, 4, 'add_attachment', 'cash_advance_attachments', '78', '{\"cashAdvanceId\":\"48\",\"fileName\":\"Layout.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":172481}', '192.168.0.110', '2026-06-25 02:01:26'),
(185, 4, 'add_attachment', 'cash_advance_attachments', '79', '{\"cashAdvanceId\":\"48\",\"fileName\":\"365.5 cm.png\",\"fileType\":\"image/png\",\"fileSize\":31217}', '192.168.0.110', '2026-06-25 02:01:26'),
(186, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-25 02:13:14'),
(187, 3, 'create_cash_advance', 'cash_advances', '49', '{\"advanceNumber\":\"CA-202606-5312\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:07:55'),
(188, 3, 'add_attachment', 'cash_advance_attachments', '80', '{\"cashAdvanceId\":\"49\",\"fileName\":\"DR Summary 39750.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":194335}', '192.168.0.110', '2026-06-25 07:07:55'),
(189, 4, 'create_cash_advance', 'cash_advances', '50', '{\"advanceNumber\":\"CA-202606-3543\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:14:00'),
(190, 4, 'cancel_cash_advance', 'cash_advances', '50', '{\"previousStatus\":\"pending\"}', '192.168.0.110', '2026-06-25 07:14:17'),
(191, 5, 'create_cash_advance', 'cash_advances', '51', '{\"advanceNumber\":\"CA-202606-8318\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:15:24'),
(192, 5, 'add_attachment', 'cash_advance_attachments', '81', '{\"cashAdvanceId\":\"51\",\"fileName\":\"BP-GD-005.00- (LCC LEGASPI).pdf\",\"fileType\":\"application/pdf\",\"fileSize\":179134}', '192.168.0.110', '2026-06-25 07:15:24'),
(193, 5, 'update_cash_advance', 'cash_advances', '51', '{\"advanceNumber\":\"CA-202606-8318\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:22:09'),
(194, 5, 'update_cash_advance', 'cash_advances', '51', '{\"advanceNumber\":\"CA-202606-8318\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:27:25'),
(195, 5, 'update_cash_advance', 'cash_advances', '51', '{\"advanceNumber\":\"CA-202606-8318\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:28:30'),
(196, 5, 'create_cash_advance', 'cash_advances', '52', '{\"advanceNumber\":\"CA-202606-8065\",\"advanceType\":\"cash\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:29:18'),
(197, 5, 'update_cash_advance', 'cash_advances', '52', '{\"advanceNumber\":\"CA-202606-8065\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:36:36'),
(198, 5, 'update_cash_advance', 'cash_advances', '52', '{\"advanceNumber\":\"CA-202606-8065\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 07:41:26'),
(199, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-25 07:59:34'),
(200, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-25 07:59:44'),
(201, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-25 07:59:53'),
(202, 4, 'create_cash_advance', 'cash_advances', '53', '{\"advanceNumber\":\"CA-202606-0508\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 09:33:40'),
(203, 4, 'add_attachment', 'cash_advance_attachments', '82', '{\"cashAdvanceId\":\"53\",\"fileName\":\"1. 7-ELEVEN.jpg\",\"fileType\":\"image/jpeg\",\"fileSize\":2592643}', '192.168.0.110', '2026-06-25 09:33:40'),
(204, 5, 'update_cash_advance', 'cash_advances', '51', '{\"advanceNumber\":\"CA-202606-8318\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-25 09:36:15'),
(205, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.110', '2026-06-26 02:05:27'),
(206, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.110', '2026-06-26 02:05:46'),
(207, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.110', '2026-06-26 02:06:04'),
(208, 4, 'update_cash_advance', 'cash_advances', '50', '{\"advanceNumber\":\"CA-202606-3543\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-26 02:07:35'),
(209, 4, 'update_cash_advance', 'cash_advances', '47', '{\"advanceNumber\":\"CA-202606-5184\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.0.110', '2026-06-26 05:15:45'),
(210, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.119', '2026-06-26 08:03:35'),
(211, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.0.119', '2026-06-26 08:04:16'),
(212, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.0.119', '2026-06-26 08:04:44'),
(213, 5, 'update_cash_advance', 'cash_advances', '52', '{\"advanceNumber\":\"CA-202606-8065\",\"status\":\"draft\",\"department\":\"MIS\"}', '192.168.0.119', '2026-06-26 09:05:31'),
(214, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-29 09:22:44'),
(215, 4, 'cancel_cash_advance', 'cash_advances', '53', '{\"previousStatus\":\"pending\"}', '192.168.1.227', '2026-06-29 09:39:30'),
(216, 4, 'update_cash_advance', 'cash_advances', '53', '{\"advanceNumber\":\"CA-202606-0508\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.227', '2026-06-29 09:39:34'),
(217, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.227', '2026-06-29 09:39:49'),
(218, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.227', '2026-06-29 09:40:17'),
(219, 4, 'update_cash_advance', 'cash_advances', '47', '{\"advanceNumber\":\"CA-202606-5184\",\"status\":\"pending\",\"department\":\"MIS\"}', '192.168.1.227', '2026-06-29 09:46:42'),
(220, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-30 02:37:10'),
(221, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.227', '2026-06-30 03:52:23'),
(222, 5, 'cancel_cash_advance', 'cash_advances', '51', '{\"previousStatus\":\"pending\"}', '192.168.1.227', '2026-06-30 05:58:38'),
(223, 5, 'update_cash_advance', 'cash_advances', '51', '{\"advanceNumber\":\"CA-202606-8318\",\"status\":\"approved\",\"department\":\"MIS\"}', '192.168.1.227', '2026-06-30 05:58:42'),
(224, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.227', '2026-06-30 05:59:18'),
(225, 3, 'login_failed', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"reason\":\"incorrect_password\"}', '192.168.1.227', '2026-06-30 06:59:16'),
(226, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.227', '2026-06-30 06:59:22'),
(227, 2, 'login_failed', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.1.227', '2026-06-30 08:04:42'),
(228, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-30 08:04:47'),
(229, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-30 08:46:32'),
(230, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-30 08:59:21'),
(231, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-30 09:00:02'),
(232, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.227', '2026-06-30 09:33:48'),
(233, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC Merchandising\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 09:38:58'),
(234, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC Merchandising\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 09:40:38'),
(235, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC Merchandising\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 09:55:11'),
(236, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"MIS\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 09:55:17'),
(237, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC Merchandising\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 09:57:19'),
(238, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC MERCHANDISING\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 10:06:33'),
(239, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC MERCHANDISING\",\"isApprover\":false}', '192.168.1.227', '2026-06-30 10:09:04'),
(240, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"EPC MERCHANDISING\",\"isApprover\":true}', '192.168.1.227', '2026-06-30 10:09:16'),
(241, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-02 09:28:21'),
(242, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-02 09:34:26'),
(243, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.214', '2026-07-02 10:00:37'),
(244, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-02 10:24:35'),
(245, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-02 11:17:50'),
(246, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-03 11:02:31'),
(247, 4, 'login_failed', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"reason\":\"incorrect_password\"}', '192.168.1.214', '2026-07-06 06:40:10'),
(248, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-06 06:40:16'),
(249, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-06 06:40:29'),
(250, 3, 'login_failed', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"reason\":\"incorrect_password\"}', '192.168.1.214', '2026-07-06 07:14:52'),
(251, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.214', '2026-07-06 07:15:00'),
(252, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-06 07:24:21'),
(253, 2, 'user_updated', 'users', '4', '{\"name\":\"Roland Alavera\",\"email\":\"roland.alavera@barbizonfashion.com\",\"role\":\"employee\",\"department\":\"MIS\",\"isApprover\":true}', '192.168.1.214', '2026-07-06 07:24:32'),
(254, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-06 07:25:09'),
(255, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-06 07:25:41'),
(256, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-06 07:47:23'),
(257, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-06 10:43:36'),
(258, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-06 10:44:16'),
(259, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-07 03:57:07'),
(260, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-07 03:59:05'),
(261, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-07 05:31:04'),
(262, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.214', '2026-07-07 05:31:45'),
(263, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-07 05:39:10'),
(264, 4, 'login', 'users', '4', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-07 05:45:24'),
(265, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.214', '2026-07-07 05:45:33'),
(266, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-07 06:14:47'),
(267, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-07 07:24:45'),
(268, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.214', '2026-07-07 07:24:59'),
(269, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.1.214', '2026-07-07 07:47:05'),
(270, 5, 'login', 'users', '5', '{\"email\":\"bloodykill02@gmail.com\",\"success\":true}', '192.168.1.214', '2026-07-07 07:47:58'),
(271, 3, 'login', 'users', '3', '{\"email\":\"roland.alavera@everydayproductscorp.net\",\"success\":true}', '192.168.1.214', '2026-07-07 07:48:50'),
(272, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"roland.alavera@everydayproductscorp.net\",\"role\":\"accounting\",\"department\":\"Finance\",\"isApprover\":true}', '192.168.1.214', '2026-07-07 07:50:04'),
(273, 3, 'create_cash_advance', 'cash_advances', '54', '{\"advanceNumber\":\"CA-202607-8126\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"FINANCE\"}', '192.168.1.214', '2026-07-07 10:09:39'),
(274, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-07-10 01:35:19'),
(275, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-07-10 02:12:40'),
(276, 2, 'user_updated', 'users', '3', '{\"name\":\"Jessie Accounting\",\"email\":\"accounting@dummy.com\",\"role\":\"accounting\",\"department\":\"FINANCE\",\"isApprover\":true}', '192.168.0.133', '2026-07-10 02:13:00'),
(277, 2, 'user_updated', 'users', '5', '{\"name\":\"Mike Approver\",\"email\":\"approver@dummy.com\",\"role\":\"manager\",\"department\":\"MIS\",\"isApprover\":true}', '192.168.0.133', '2026-07-10 02:13:13'),
(278, 2, 'user_updated', 'users', '4', '{\"name\":\"Roland Alavera\",\"email\":\"requestor@dummy.com\",\"role\":\"employee\",\"department\":\"MIS\",\"isApprover\":true}', '192.168.0.133', '2026-07-10 02:13:40'),
(279, 2, 'user_updated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\",\"role\":\"accounting\",\"department\":\"FINANCE\",\"isApprover\":true}', '192.168.0.133', '2026-07-10 02:55:27'),
(280, 2, 'user_updated', 'users', '5', '{\"name\":\"Approver Dummy\",\"email\":\"approver@dummy.com\",\"role\":\"manager\",\"department\":\"MIS\",\"isApprover\":true}', '192.168.0.133', '2026-07-10 02:55:36'),
(281, 2, 'user_updated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\",\"role\":\"accounting\",\"department\":\"FINANCE\",\"isApprover\":false}', '192.168.0.133', '2026-07-10 02:55:41'),
(282, 2, 'user_updated', 'users', '4', '{\"name\":\"Requestor Dummy\",\"email\":\"requestor@dummy.com\",\"role\":\"employee\",\"department\":\"MIS\",\"isApprover\":true}', '192.168.0.133', '2026-07-10 02:55:56'),
(283, 2, 'user_updated', 'users', '2', '{\"name\":\"Admin Dummy\",\"email\":\"admin@barbizonfashion.com\",\"role\":\"admin\",\"department\":\"MIS\",\"isApprover\":false}', '192.168.0.133', '2026-07-10 02:56:07'),
(284, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-07-10 02:56:19'),
(285, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-07-10 03:00:55'),
(286, 2, 'user_deleted', 'users', '7', '{\"name\":\"Roland Alavera\",\"email\":\"roland.alavera@barbizonfashion.com\"}', '192.168.0.133', '2026-07-10 03:01:02'),
(287, 2, 'user_deactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:08:18'),
(288, 2, 'user_updated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\",\"role\":\"accounting\",\"department\":\"FINANCE\",\"isApprover\":false}', '192.168.0.133', '2026-07-10 03:08:27'),
(289, 2, 'user_updated', 'users', '2', '{\"name\":\"Admin Dummy\",\"email\":\"admin@barbizonfashion.com\",\"role\":\"admin\",\"department\":\"MIS\",\"isApprover\":false}', '192.168.0.133', '2026-07-10 03:25:58'),
(290, 2, 'user_reactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:38:50'),
(291, 2, 'user_deactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:38:56'),
(292, 2, 'user_reactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:38:59'),
(293, 2, 'user_deactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:44:57'),
(294, 2, 'user_reactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:45:00'),
(295, 2, 'user_deactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 03:48:25'),
(296, 2, 'cash-advance_rejectd', 'cash_advances', '48', '{\"amount\":\"25500.00\",\"remarks\":\"Test \"}', '192.168.0.133', '2026-07-10 03:48:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity`, `entity_id`, `details`, `ip`, `created_at`) VALUES
(297, 2, 'user_reactivated', 'users', '3', '{\"name\":\"Accounting Dummy\",\"email\":\"accounting@dummy.com\"}', '192.168.0.133', '2026-07-10 06:19:53'),
(298, NULL, 'login', 'users', '8', '{\"email\":\"roland.alavera@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-07-10 07:19:05'),
(299, NULL, 'password_reset', 'users', '8', '{\"method\":\"otp\"}', '192.168.0.133', '2026-07-10 07:28:50'),
(300, 2, 'login', 'users', '2', '{\"email\":\"admin@barbizonfashion.com\",\"success\":true}', '192.168.0.133', '2026-07-10 07:44:38'),
(301, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 07:45:30'),
(302, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 08:00:59'),
(303, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 08:16:50'),
(304, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 08:27:46'),
(305, 2, 'login', 'users', '2', '{\"email\":\"admin@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 09:05:18'),
(306, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 09:10:53'),
(307, 3, 'update_cash_advance', 'cash_advances', '53', '{\"advanceNumber\":\"CA-202606-0508\",\"status\":\"approved\",\"department\":\"EPC Merchandising\"}', '192.168.0.133', '2026-07-10 09:17:07'),
(308, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 09:18:56'),
(309, 3, 'update_cash_advance', 'cash_advances', '53', '{\"advanceNumber\":\"CA-202606-0508\",\"status\":\"approved\",\"department\":\"EPC Merchandising\",\"editedBy\":{\"id\":3,\"email\":\"accounting@dummy.com\",\"role\":\"accounting\"},\"reason\":null,\"changes\":{\"requested_amount\":{\"from\":\"100000.00\",\"to\":50000}}}', '192.168.0.133', '2026-07-10 09:26:27'),
(310, 3, 'update_cash_advance', 'cash_advances', '53', '{\"advanceNumber\":\"CA-202606-0508\",\"status\":\"released\",\"department\":\"EPC Merchandising\",\"editedBy\":{\"id\":3,\"email\":\"accounting@dummy.com\",\"role\":\"accounting\"},\"reason\":\"Edit by the Accounting\",\"autoReleased\":true,\"changes\":{\"requested_amount\":{\"from\":\"50000.00\",\"to\":500},\"liquidation_deadline\":{\"from\":null,\"to\":\"2026-07-13\"},\"status\":{\"from\":\"approved\",\"to\":\"released\"},\"approved_by\":{\"from\":\"Requestor Dummy\",\"to\":null},\"approved_at\":{\"from\":\"2026-07-06 15:25:26\",\"to\":null}}}', '192.168.0.133', '2026-07-10 10:21:22'),
(311, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.0.133', '2026-07-10 10:26:37'),
(312, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 02:51:28'),
(313, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 02:56:24'),
(314, 5, 'login', 'users', '5', '{\"email\":\"approver@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 06:44:18'),
(315, 5, 'cash-advance_approved', 'cash_advances', '50', '{\"amount\":\"5000.00\",\"remarks\":null,\"usedRevolvingFund\":false}', '192.168.1.136', '2026-07-13 07:33:22'),
(316, 5, 'login', 'users', '5', '{\"email\":\"approver@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 07:35:51'),
(317, 2, 'login', 'users', '2', '{\"email\":\"admin@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 07:36:54'),
(318, 2, 'user_updated', 'users', '4', '{\"name\":\"Requestor Dummy\",\"email\":\"requestor@dummy.com\",\"role\":\"employee\",\"department\":\"Operations\",\"isApprover\":true}', '192.168.1.136', '2026-07-13 07:37:12'),
(319, 2, 'user_updated', 'users', '5', '{\"name\":\"Approver Dummy\",\"email\":\"approver@dummy.com\",\"role\":\"manager\",\"department\":\"Operations\",\"isApprover\":true}', '192.168.1.136', '2026-07-13 07:37:22'),
(320, 5, 'login', 'users', '5', '{\"email\":\"approver@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 07:37:36'),
(321, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 07:38:00'),
(322, 2, 'login', 'users', '2', '{\"email\":\"admin@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 07:38:23'),
(323, 2, 'user_updated', 'users', '4', '{\"name\":\"Requestor Dummy\",\"email\":\"requestor@dummy.com\",\"role\":\"employee\",\"department\":\"OPERATIONS\",\"isApprover\":false}', '192.168.1.136', '2026-07-13 07:38:33'),
(324, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 07:38:43'),
(325, 4, 'create_cash_advance', 'cash_advances', '55', '{\"advanceNumber\":\"CA-202607-7625\",\"advanceType\":\"cash\",\"status\":\"draft\",\"department\":\"OPERATIONS\"}', '192.168.1.136', '2026-07-13 07:39:37'),
(326, 4, 'update_cash_advance', 'cash_advances', '55', '{\"advanceNumber\":\"CA-202607-7625\",\"status\":\"pending\",\"department\":\"Operations\",\"editedBy\":{\"id\":4,\"email\":\"requestor@dummy.com\",\"role\":\"employee\"},\"reason\":null,\"autoReleased\":false,\"changes\":{\"end_date\":{\"from\":null,\"to\":\"2026-07-20\"},\"requested_amount\":{\"from\":\"1500.00\",\"to\":1500},\"date_coverage\":{\"from\":null,\"to\":\"July 20, 2026 - July 20, 2026\"},\"status\":{\"from\":\"draft\",\"to\":\"pending\"}}}', '192.168.1.136', '2026-07-13 07:39:49'),
(327, 5, 'cash-advance_approved', 'cash_advances', '55', '{\"amount\":\"1500.00\",\"remarks\":null,\"usedRevolvingFund\":false}', '192.168.1.136', '2026-07-13 07:40:04'),
(328, 5, 'cash-advance_approved', 'cash_advances', '55', '{\"amount\":\"1500.00\",\"remarks\":null,\"usedRevolvingFund\":true}', '192.168.1.136', '2026-07-13 07:46:36'),
(329, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 08:23:04'),
(330, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 09:24:54'),
(331, 4, 'create_cash_advance', 'cash_advances', '56', '{\"advanceNumber\":\"CA-202607-3081\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"OPERATIONS\"}', '192.168.1.136', '2026-07-13 09:25:40'),
(332, 4, 'create_cash_advance', 'cash_advances', '57', '{\"advanceNumber\":\"CA-202607-8399\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"OPERATIONS\"}', '192.168.1.136', '2026-07-13 09:26:45'),
(333, 5, 'cash-advance_approved', 'cash_advances', '57', '{\"amount\":\"50000.00\",\"remarks\":null,\"usedRevolvingFund\":false}', '192.168.1.136', '2026-07-13 09:45:59'),
(334, 3, 'cash-advance_released', 'cash_advances', '44', '{\"amount\":\"1000.00\",\"remarks\":null,\"usedRevolvingFund\":true}', '192.168.1.136', '2026-07-13 09:47:01'),
(335, 4, 'create_cash_advance', 'cash_advances', '58', '{\"advanceNumber\":\"CA-202607-4132\",\"advanceType\":\"cash\",\"status\":\"pending\",\"department\":\"OPERATIONS\"}', '192.168.1.136', '2026-07-13 10:01:53'),
(336, 4, 'cancel_cash_advance', 'cash_advances', '58', '{\"previousStatus\":\"pending\"}', '192.168.1.136', '2026-07-13 10:01:58'),
(337, 4, 'update_cash_advance', 'cash_advances', '58', '{\"advanceNumber\":\"CA-202607-4132\",\"status\":\"pending\",\"department\":\"Operations\",\"editedBy\":{\"id\":4,\"email\":\"requestor@dummy.com\",\"role\":\"employee\"},\"reason\":null,\"autoReleased\":false,\"changes\":{\"requested_amount\":{\"from\":\"2500.00\",\"to\":25000},\"status\":{\"from\":\"cancelled\",\"to\":\"pending\"}}}', '192.168.1.136', '2026-07-13 10:02:05'),
(338, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 11:04:14'),
(339, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 11:19:22'),
(340, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-13 11:22:07'),
(341, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-14 05:01:30'),
(342, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-14 05:43:07'),
(343, 3, 'login', 'users', '3', '{\"email\":\"accounting@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-14 07:08:07'),
(344, 4, 'login', 'users', '4', '{\"email\":\"requestor@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-14 08:49:58'),
(345, 2, 'login', 'users', '2', '{\"email\":\"admin@dummy.com\",\"success\":true}', '192.168.1.136', '2026-07-14 08:58:09'),
(346, 3, 'cash-advance_released', 'cash_advances', '50', '{\"amount\":\"5000.00\",\"remarks\":null,\"usedRevolvingFund\":false}', '192.168.1.136', '2026-07-14 08:58:44'),
(347, 3, 'cash-advance_released', 'cash_advances', '43', '{\"amount\":\"650.00\",\"remarks\":null,\"usedRevolvingFund\":true}', '192.168.1.136', '2026-07-14 08:59:06');

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

--
-- Dumping data for table `cash_advances`
--

INSERT INTO `cash_advances` (`id`, `advance_number`, `advance_date`, `requested_by`, `department_id`, `business_unit`, `employee_id`, `purpose`, `project_name`, `destination`, `start_date`, `end_date`, `requested_amount`, `approved_amount`, `payment_method`, `account_number`, `date_needed`, `date_coverage`, `status`, `advance_type`, `remarks`, `gcash_name`, `created_by`, `created_at`, `updated_at`, `approved_by`, `approved_at`, `reject_remarks`, `disbursed_at`, `liquidated_at`, `liquidation_deadline`, `released_by`, `released_at`, `release_remarks`, `funding_code`, `alert_sent_at`) VALUES
(41, 'CA-202606-6430', '2026-06-18', 'Requestor Dummy', 7, 'Shared', '4', 'First Sample of Cash Advance Request', NULL, NULL, '2026-06-17', '2026-06-19', 5000.00, NULL, 'gcash', '09103459681', '2026-06-25', 'June 29, 2026 - June 30, 2026', 'released', 'cash', NULL, 'Requestor Dummy', 'requestor@dummy.com', '2026-06-18 03:55:01', '2026-07-14 07:09:46', 'Approver Dummy', '2026-06-29 09:49:56', NULL, NULL, NULL, '2026-06-22', 'Accounting Dummy', '2026-06-29 17:50:11', NULL, '', NULL),
(42, 'CA-202606-4966', '2026-06-18', 'Requestor Dummy', 7, 'NBFI', '4', 'Second Sample of Cash Advance Request', NULL, NULL, '2026-06-22', '2026-06-25', 2700.00, NULL, 'payroll', '000-1245-55455', '2026-06-25', 'June 25, 2026 - June 25, 2026', 'released', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-06-18 05:29:39', '2026-07-14 07:09:49', 'Approver Dummy', '2026-06-29 09:49:58', NULL, NULL, NULL, '2026-07-02', 'Accounting Dummy', '2026-06-29 17:50:09', NULL, '', NULL),
(43, 'CA-202606-9457', '2026-06-18', 'Requestor Dummy', 2, 'NBFI', '4', 'Third Sample of Cash Advance Request', NULL, NULL, '2026-06-25', '2026-06-25', 650.00, NULL, 'gcash', '09103459681', '2026-06-25', 'June 25, 2026 - June 25, 2026', 'released', 'cash', NULL, 'Requestor Dummy', 'requestor@dummy.com', '2026-06-18 05:48:00', '2026-07-14 08:59:06', 'Approver Dummy', '2026-06-30 07:04:47', NULL, NULL, NULL, '2026-07-17', 'Accounting Dummy', '2026-07-14 16:59:06', NULL, 'ARF', NULL),
(44, 'CA-202606-7133', '2026-06-23', 'Requestor Dummy', 3, 'NBFI', '4', 'Forth Sample of Cash Advance Request', NULL, NULL, '2026-06-25', '2026-06-25', 1000.00, NULL, 'payroll', '000-1245-55455', '2026-06-25', 'June 25, 2026 - June 25, 2026', 'released', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-06-18 06:05:29', '2026-07-13 09:47:01', 'Approver Dummy', '2026-06-30 07:04:55', NULL, NULL, NULL, '2026-07-16', 'Accounting Dummy', '2026-07-13 17:47:01', NULL, 'ARF', NULL),
(45, 'CA-202606-5560', '2026-06-25', 'Requestor Dummy', 4, 'NBFI', '4', 'Fifth Sample of Cash Advance Request', NULL, NULL, '2026-06-02', '2026-06-02', 35000.00, NULL, 'payroll', '000-1245-55455', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'approved', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-06-25 01:58:25', '2026-07-13 06:03:03', 'Approver Dummy', '2026-06-30 07:04:53', NULL, NULL, NULL, NULL, 'Accounting Dummy', '2026-06-29 17:45:30', NULL, '', NULL),
(46, 'CA-202606-4190', '2026-06-25', 'Requestor Dummy', 7, 'NBFI', '4', 'Sixth Sample of Cash Advance Request', NULL, NULL, '2026-06-03', '2026-06-03', 200000.00, NULL, 'gcash', '09103459681', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'approved', 'cash', NULL, 'Requestor Dummy', 'requestor@dummy.com', '2026-06-25 01:59:54', '2026-07-13 06:03:08', 'Admin Dummy', '2026-07-02 11:14:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL),
(47, 'CA-202606-5184', '2026-06-25', 'Requestor Dummy', 7, 'NBFI', '4', 'Seventh Sample of Cash Advance Request', NULL, NULL, '2026-06-04', '2026-06-04', 12500.00, NULL, 'gcash', '09103459681', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'approved', 'cash', NULL, 'Requestor Dummy', 'requestor@dummy.com', '2026-06-25 02:00:40', '2026-07-13 06:03:12', 'Approver Dummy', '2026-06-30 07:04:51', 'This is rejected from APPROVER', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL),
(48, 'CA-202606-9578', '2026-06-25', 'Accounting Dummy', 7, 'NBFI', '4', 'Eight Sample of Cash Advance Request', NULL, NULL, '2026-06-04', '2026-06-04', 25500.00, NULL, 'payroll', '000-1245-55455', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'rejected', 'cash', NULL, NULL, 'accounting@dummy.com', '2026-06-25 02:01:26', '2026-07-13 06:03:15', 'Admin Dummy', '2026-07-10 03:48:43', 'Test ', NULL, NULL, NULL, 'Accounting Dummy', '2026-06-25 17:36:24', NULL, '', NULL),
(49, 'CA-202606-5312', '2026-06-25', 'Accounting Dummy', 7, 'EPC', '3', 'Accounting Cash Advance Request', NULL, NULL, '2026-06-05', '2026-06-05', 1200.00, NULL, 'gcash', '091326532983', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'pending', 'cash', NULL, 'Accounting Dummy', 'accounting@dummy.com', '2026-06-25 07:07:55', '2026-07-13 06:03:18', 'Approver Dummy', '2026-06-25 09:48:03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL),
(50, 'CA-202606-3543', '2026-06-25', 'Requestor Dummy', 7, 'NBFI', '4', 'Manager Cash Advance Request', NULL, NULL, '2026-06-05', '2026-06-05', 5000.00, NULL, 'payroll', '000-1245-55455', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'released', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-06-25 07:14:00', '2026-07-14 08:58:44', 'Approver Dummy', '2026-07-13 07:33:22', NULL, NULL, NULL, '2026-07-17', 'Accounting Dummy', '2026-07-14 16:58:44', NULL, '', NULL),
(51, 'CA-202606-8318', '2026-06-25', 'Approver Dummy', 7, 'NBFI', '5', 'Manager Cash Advance Request', NULL, NULL, '2026-06-05', '2026-06-05', 3920.00, NULL, 'payroll', '091231763', '2026-06-05', 'June 5, 2026 - June 5, 2026', 'released', 'cash', 'Cancel this request', NULL, 'approver@dummy.com', '2026-06-25 07:15:24', '2026-07-13 06:03:28', 'Approver Dummy', '2026-06-29 16:00:00', NULL, NULL, NULL, '2026-07-03', 'Accounting Dummy', '2026-06-30 15:07:39', NULL, '', NULL),
(52, 'CA-202606-8065', '2026-06-25', 'Approver Dummy', 7, 'NBFI', '5', 'Manager Second Cash Advance Request', NULL, NULL, '2026-06-17', '2026-06-17', 1000.00, NULL, 'payroll', '091231763', '2026-07-02', 'July 2, 2026 - July 2, 2026', 'draft', 'cash', NULL, NULL, 'approver@dummy.com', '2026-06-25 07:29:18', '2026-07-13 06:03:31', NULL, NULL, 'This is a reject from ACCOUNTING', NULL, NULL, NULL, 'Accounting Dummy', '2026-06-26 11:10:38', NULL, '', NULL),
(53, 'CA-202606-0508', '2026-07-10', 'Approver Dummy', 1, 'NBFI', '3', 'Request after Adding function when manager request for cash advance.', NULL, NULL, '2026-06-19', '2026-06-23', 500.00, NULL, 'payroll', '0392365625', '2026-07-02', 'June 19, 2026 - June 23, 2026', 'released', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-06-25 09:33:40', '2026-07-14 06:49:01', 'Approver Dummy', NULL, NULL, NULL, NULL, '2026-07-13', 'Accounting Dummy', '2026-06-29 17:40:23', NULL, '', NULL),
(54, 'CA-202607-8126', '2026-07-07', 'Accounting Dummy', 5, 'EPC', '3', '2nd Accounting Cash Advance Request', NULL, NULL, '2026-07-14', '2026-07-14', 500.00, NULL, 'payroll', '0392365625', '2026-07-14', 'July 14, 2026 - July 14, 2026', 'pending', 'cash', NULL, NULL, 'accounting@dummy.com', '2026-07-07 10:09:39', '2026-07-13 06:03:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL),
(55, 'CA-202607-7625', '2026-07-13', 'Requestor Dummy', 8, 'NBFI', '4', 'This is a request #1 for Operations Account', NULL, NULL, '2026-07-20', '2026-07-20', 1500.00, NULL, 'gcash', '09103459681', '2026-07-20', 'July 20, 2026 - July 20, 2026', 'approved', 'cash', NULL, 'Roland Alavera', 'requestor@dummy.com', '2026-07-13 07:39:37', '2026-07-13 07:46:36', 'Approver Dummy', '2026-07-13 07:46:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ORF', NULL),
(56, 'CA-202607-3081', '2026-07-13', 'Requestor Dummy', 8, 'NBFI', '4', 'This is the 2nd Request of Cash Advance in Accounting', NULL, NULL, '2026-07-20', '2026-07-20', 3000.00, NULL, 'payroll', '000-1245-55455', '2026-07-20', 'July 20, 2026 - July 20, 2026', 'pending', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-07-13 09:25:40', '2026-07-13 09:25:40', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL),
(57, 'CA-202607-8399', '2026-07-13', 'Requestor Dummy', 8, 'NBFI', '4', 'Third Cash Advance Request in Accounting', NULL, NULL, '2026-07-20', '2026-07-20', 50000.00, NULL, 'payroll', '000-1245-55455', '2026-07-20', 'July 20, 2026 - July 20, 2026', 'approved', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-07-13 09:26:45', '2026-07-13 09:45:59', 'Approver Dummy', '2026-07-13 09:45:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL),
(58, 'CA-202607-4132', '2026-07-13', 'Requestor Dummy', 8, 'NBFI', '4', '4th Request for Accounting', NULL, NULL, '2026-07-20', '2026-07-20', 25000.00, NULL, 'payroll', '000-1245-55455', '2026-07-20', 'July 20, 2026 - July 20, 2026', 'pending', 'cash', NULL, NULL, 'requestor@dummy.com', '2026-07-13 10:01:53', '2026-07-13 10:02:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL);

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

--
-- Dumping data for table `cash_advance_attachments`
--

INSERT INTO `cash_advance_attachments` (`id`, `cash_advance_id`, `file_name`, `file_path`, `file_type`, `file_size`, `uploaded_by`, `created_at`) VALUES
(65, 41, 'Cash Advance Request JPEG.jpg', '/uploads/cash-advances/CA-202606-6430/1781754901134-Cash_Advance_Request_JPEG.jpg', 'image/jpeg', 98844, 4, '2026-06-18 03:55:01'),
(66, 41, 'Cash Advance Request PDF.pdf', '/uploads/cash-advances/CA-202606-6430/1781754901192-Cash_Advance_Request_PDF.pdf', 'application/pdf', 23557, 4, '2026-06-18 03:55:01'),
(67, 43, 'Cash Advance Request JPEG.jpg', '/uploads/cash-advances/CA-202606-9457/1781761680588-Cash_Advance_Request_JPEG.jpg', 'image/jpeg', 98844, 4, '2026-06-18 05:48:00'),
(68, 43, 'Cash Advance Request PDF.pdf', '/uploads/cash-advances/CA-202606-9457/1781761680634-Cash_Advance_Request_PDF.pdf', 'application/pdf', 23557, 4, '2026-06-18 05:48:00'),
(69, 44, 'Scanned DUNKIN.pdf', '/uploads/cash-advances/CA-202606-7133/1782205391039-Scanned_DUNKIN.pdf', 'application/pdf', 2001120, 4, '2026-06-23 09:03:11'),
(70, 45, 'BP-GD-005.00- (LCC LEGASPI).pdf', '/uploads/cash-advances/CA-202606-5560/1782352705838-BP-GD-005.00-__LCC_LEGASPI_.pdf', 'application/pdf', 179134, 4, '2026-06-25 01:58:25'),
(71, 46, '1.png', '/uploads/cash-advances/CA-202606-4190/1782352794118-1.png', 'image/png', 163109, 4, '2026-06-25 01:59:54'),
(72, 46, '2.png', '/uploads/cash-advances/CA-202606-4190/1782352794175-2.png', 'image/png', 140777, 4, '2026-06-25 01:59:54'),
(73, 46, '3.png', '/uploads/cash-advances/CA-202606-4190/1782352794229-3.png', 'image/png', 128920, 4, '2026-06-25 01:59:54'),
(74, 46, '4.png', '/uploads/cash-advances/CA-202606-4190/1782352794269-4.png', 'image/png', 148998, 4, '2026-06-25 01:59:54'),
(75, 47, 'Gmail - Your GrabExpress Receipt.pdf', '/uploads/cash-advances/CA-202606-5184/1782352840173-Gmail_-_Your_GrabExpress_Receipt.pdf', 'application/pdf', 242566, 4, '2026-06-25 02:00:40'),
(76, 48, 'sample.pdf', '/uploads/cash-advances/CA-202606-9578/1782352886165-sample.pdf', 'application/pdf', 119986, 4, '2026-06-25 02:01:26'),
(77, 48, 'BP-GD-005.00- (LCC LEGASPI).pdf', '/uploads/cash-advances/CA-202606-9578/1782352886201-BP-GD-005.00-__LCC_LEGASPI_.pdf', 'application/pdf', 179134, 4, '2026-06-25 02:01:26'),
(78, 48, 'Layout.jpg', '/uploads/cash-advances/CA-202606-9578/1782352886237-Layout.jpg', 'image/jpeg', 172481, 4, '2026-06-25 02:01:26'),
(79, 48, '365.5 cm.png', '/uploads/cash-advances/CA-202606-9578/1782352886270-365.5_cm.png', 'image/png', 31217, 4, '2026-06-25 02:01:26'),
(80, 49, 'DR Summary 39750.pdf', '/uploads/cash-advances/CA-202606-5312/1782371275613-DR_Summary_39750.pdf', 'application/pdf', 194335, 3, '2026-06-25 07:07:55'),
(81, 51, 'BP-GD-005.00- (LCC LEGASPI).pdf', '/uploads/cash-advances/CA-202606-8318/1782371724356-BP-GD-005.00-__LCC_LEGASPI_.pdf', 'application/pdf', 179134, 5, '2026-06-25 07:15:24'),
(82, 53, '1. 7-ELEVEN.jpg', '/uploads/cash-advances/CA-202606-0508/1782380020615-1._7-ELEVEN.jpg', 'image/jpeg', 2592643, 4, '2026-06-25 09:33:40');

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

--
-- Dumping data for table `cash_advance_breakdown`
--

INSERT INTO `cash_advance_breakdown` (`id`, `cash_advance_id`, `description`, `no_of_days`, `estimated_amount`, `total_amount`, `created_at`, `updated_at`) VALUES
(482, 42, 'Laptop Repair', 1, 2500.00, 2500.00, '2026-06-23 07:35:15', '2026-06-23 07:35:15'),
(483, 42, 'Fare Expenses', 1, 200.00, 200.00, '2026-06-23 07:35:15', '2026-06-23 07:35:15'),
(484, 43, 'Delivery Fee', 1, 650.00, 650.00, '2026-06-23 07:36:22', '2026-06-23 07:36:22'),
(485, 41, 'Per Diem', 2, 1500.00, 3000.00, '2026-06-23 08:02:27', '2026-06-23 08:02:27'),
(486, 41, 'Extra Allowance', 2, 1000.00, 2000.00, '2026-06-23 08:02:27', '2026-06-23 08:02:27'),
(491, 44, 'Grab Fare', 1, 500.00, 500.00, '2026-06-23 09:03:11', '2026-06-23 09:03:11'),
(492, 44, 'Food Fee', 1, 500.00, 500.00, '2026-06-23 09:03:11', '2026-06-23 09:03:11'),
(493, 45, 'Device Loan', 1, 35000.00, 35000.00, '2026-06-25 01:58:25', '2026-06-25 01:58:25'),
(494, 46, 'Company Outing Expenses', 2, 100000.00, 200000.00, '2026-06-25 01:59:54', '2026-06-25 01:59:54'),
(496, 48, 'Building Maintenance', 1, 25500.00, 25500.00, '2026-06-25 02:01:26', '2026-06-25 02:01:26'),
(497, 49, 'Laptop Repair', 1, 1200.00, 1200.00, '2026-06-25 07:07:55', '2026-06-25 07:07:55'),
(510, 50, 'Loan', 1, 5000.00, 5000.00, '2026-06-26 02:07:35', '2026-06-26 02:07:35'),
(512, 52, 'Certification', 1, 1000.00, 1000.00, '2026-06-26 09:05:31', '2026-06-26 09:05:31'),
(514, 47, 'Office Supplies', 1, 12500.00, 12500.00, '2026-06-29 09:46:42', '2026-06-29 09:46:42'),
(515, 51, 'Loan', 1, 2500.00, 2500.00, '2026-06-30 05:58:42', '2026-06-30 05:58:42'),
(516, 51, 'Cerification Fee', 1, 1420.00, 1420.00, '2026-06-30 05:58:42', '2026-06-30 05:58:42'),
(517, 54, 'CCTV Inspection', 1, 500.00, 500.00, '2026-07-07 10:09:39', '2026-07-07 10:09:39'),
(520, 53, 'Vehicle Loan', 1, 500.00, 500.00, '2026-07-10 10:21:22', '2026-07-10 10:21:22'),
(522, 55, 'Cash Advance for Employee', 1, 1500.00, 1500.00, '2026-07-13 07:39:49', '2026-07-13 07:39:49'),
(523, 56, 'Allowance', 2, 1500.00, 3000.00, '2026-07-13 09:25:40', '2026-07-13 09:25:40'),
(524, 57, 'New Laptop', 1, 50000.00, 50000.00, '2026-07-13 09:26:45', '2026-07-13 09:26:45'),
(526, 58, 'Application Subscription', 1, 25000.00, 25000.00, '2026-07-13 10:02:05', '2026-07-13 10:02:05');

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

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `name`, `run_at`) VALUES
(1, '001-create-database.sql', '2025-12-11 08:11:29'),
(2, '002-create-users-table.sql', '2025-12-11 08:11:29'),
(5, '003-create-roles-table.sql', '2025-12-11 08:13:29'),
(6, '004-create-user-roles.sql', '2025-12-11 08:13:29'),
(7, '005-create-audit-logs.sql', '2025-12-11 08:13:29'),
(8, '006-create-uploads-table.sql', '2025-12-11 08:13:29'),
(15, '007-add-roleid-to-users.sql', '2025-12-11 08:16:49'),
(22, '008-drop-roles-and-user_roles.sql', '2025-12-11 08:18:56'),
(23, '009-create-departments.sql', '2025-12-11 11:39:39'),
(24, '010-add-user-fields.sql', '2025-12-26 09:18:01'),
(25, '011-create-disbursements-table.sql', '2025-12-26 09:18:01'),
(26, '012-create-disbursement-line-items-table.sql', '2025-12-26 09:18:01'),
(27, '013-create-disbursement-attachments-table.sql', '2025-12-26 09:18:01'),
(28, '014-create-cash-advances-table.sql', '2025-12-26 09:26:46'),
(29, '015-create-cash-advance-items-table.sql', '2025-12-26 09:26:46'),
(30, '016-create-cash-advance-attachments-table.sql', '2025-12-26 09:26:46'),
(31, '017-create-liquidations-table.sql', '2025-12-26 09:35:36'),
(32, '018-create-liquidation-items-table.sql', '2025-12-26 09:35:36'),
(33, '019-create-liquidation-attachments-table.sql', '2025-12-26 09:35:36'),
(34, '020-create-reimbursements-table.sql', '2025-12-26 09:39:24'),
(35, '021-create-reimbursement-items-table.sql', '2025-12-26 09:39:24'),
(36, '022-create-reimbursement-attachments-table.sql', '2025-12-26 09:39:24'),
(37, '023-drop-disbursement-tables.sql', '2025-12-26 09:44:53'),
(38, '024-add-previous-status-to-liquidations.sql', '2026-01-13 08:14:49'),
(39, '025-add-payment-reason-to-cash-advances.sql', '2026-01-13 08:14:49'),
(40, '026-update-payment-method-enum.sql', '2026-01-13 08:14:49'),
(41, '027-create-cash-advance-activities.sql', '2026-01-13 08:14:49'),
(42, '028-rename-description-to-particulars.sql', '2026-01-13 08:14:49'),
(43, '029-drop-category-column.sql', '2026-01-13 08:25:45'),
(44, '030-add-business-unit-date-fields.sql', '2026-01-13 08:32:31'),
(45, '031-create-cash-advance-other-items.sql', '2026-01-13 10:27:56'),
(46, '032-drop-cash-advance-other-items.sql', '2026-01-13 11:26:41'),
(47, '032-add-travel-fields-to-liquidation-items.sql', '2026-01-17 07:05:03'),
(48, '033-add-advance-type-to-cash-advances.sql', '2026-01-17 07:22:36'),
(49, '034-create-approver-table.sql', '2026-01-19 09:13:01'),
(50, '035-add-approved-by-name-column.sql', '2026-01-30 06:34:06'),
(52, '036-add-payment-reason-to-liquidations.sql', '2026-01-30 06:35:49'),
(53, '037-create-travel-liquidation-tables.sql', '2026-01-30 06:35:49'),
(54, '038-replace-cash-with-gcash.sql', '2026-01-30 06:35:49'),
(55, '039-add-user-payment-info.sql', '2026-01-30 06:38:12'),
(56, '040-add-date-to-cash-advance-items.sql', '2026-02-02 03:05:36'),
(57, '041-add-days-total-to-ca-items.sql', '2026-02-03 03:44:22'),
(58, '042-remove-expense-date-from-ca-items.sql', '2026-02-03 03:44:22'),
(59, '043-rename-payment-reason-to-gcash-name.sql', '2026-02-04 11:13:30'),
(60, '044-add-missing-columns.sql', '2026-02-04 11:20:52'),
(61, '045-remove-check-number.sql', '2026-02-04 11:24:15'),
(62, '046-fix-payment-method-enum.sql', '2026-02-04 11:29:50'),
(63, '047-restrict-payment-method.sql', '2026-02-04 11:35:38'),
(64, '048-add-release-columns.sql', '2026-02-05 07:17:36'),
(65, '049-rename-receipt-number-to-tim.sql', '2026-02-05 07:17:36'),
(66, '050-rename-tim-to-tin.sql', '2026-02-05 07:27:44'),
(67, '051-remove-estimated-amount.sql', '2026-02-05 07:39:42'),
(68, '052-add-liquidation-fields.sql', '2026-02-05 07:46:43'),
(69, '053-rename-actual-amount.sql', '2026-02-05 08:17:06'),
(70, '054-unify-liquidation-items.sql', '2026-02-05 08:38:54'),
(71, '055-add-address-to-liquidation-items.sql', '2026-02-05 09:35:29'),
(72, '056-align-liquidations-payment-fields.sql', '2026-02-05 10:42:05'),
(73, '057-make-activity-id-nullable.sql', '2026-02-05 11:36:52');

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

--
-- Dumping data for table `otp_verifications`
--

INSERT INTO `otp_verifications` (`id`, `email`, `purpose`, `otp_hash`, `expires_at`, `attempts`, `last_sent_at`, `created_at`) VALUES
(3, 'roland.alavera@barbizonfashion.com', 'reset', '$2a$10$IPhRK605EfCIVASg4g9sXeiiyKonyJLr/2hXZasX.ueezMTScjS/S', '2026-07-10 15:41:32', 0, '2026-07-10 15:31:32', '2026-07-10 15:29:04'),
(5, 'roland.alavera@barbizonfashion.com', 'signup', '$2a$10$UHWqrYPY7MLmg6EiBYL7XOPhdpWoDS6Cfewl3MEI8iURLtS0IZFOe', '2026-07-10 15:53:05', 0, '2026-07-10 15:43:05', '2026-07-10 15:43:05');

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

--
-- Dumping data for table `reimbursements`
--

INSERT INTO `reimbursements` (`id`, `reimbursement_number`, `submitted_by`, `department_id`, `business_unit`, `reimbursement_date`, `date_needed`, `start_date`, `end_date`, `purpose`, `total_actual_amount`, `payment_method`, `gcash_name`, `account_number`, `remarks`, `status`, `created_by`, `approved_by`, `approved_by_name`, `approved_at`, `reject_remarks`, `completed_at`, `created_at`, `updated_at`, `previous_status`, `released_by`, `released_at`, `release_remarks`, `funding_code`) VALUES
(5, 'RI-202606-3257', 'Requestor Dummy', 7, 'EPC', '2026-06-15', '2026-06-22', '2026-06-22', '2026-06-22', 'Sample Purpose', 334.00, 'payroll', NULL, '000-1245-55455', NULL, 'released', 'requestor@dummy.com', 'Mike Approver', NULL, '2026-06-22 11:00:23', NULL, NULL, '2026-06-15 06:01:10', '2026-07-14 08:52:14', NULL, 'Jessie Accounting', '2026-06-23 16:00:20', NULL, ''),
(12, 'RI-202606-9642', 'Requestor Dummy', 7, 'EPC', '2026-06-18', '2026-06-25', '2026-06-25', '2026-06-25', 'First Sample of Reimbursement', 431.00, 'gcash', 'Roland Alavera', '09103459681', NULL, 'rejected', 'requestor@dummy.com', 'Mike Approver', NULL, '2026-06-26 02:41:25', 'This is a reason for rejection from ACCOUNTING', NULL, '2026-06-18 06:19:12', '2026-07-14 08:52:17', NULL, 'Jessie Accounting', '2026-06-26 10:42:20', NULL, ''),
(13, 'RI-202606-0262', 'Approver Dummy', 7, 'EPC', '2026-06-25', '2026-07-02', '2026-07-02', '2026-07-02', 'Manager Sample of Reimbursement Request', 1078.00, 'gcash', 'Mike Approver', '09103213123', 'STORE VISIT IN SM BICUTAN', 'released', 'approver@dummy.com', NULL, NULL, NULL, NULL, NULL, '2026-06-25 09:57:32', '2026-07-14 08:52:29', NULL, 'Jessie Accounting', '2026-06-25 17:58:02', NULL, ''),
(14, 'RI-202606-1492', 'Approver Dummy', 7, 'EPC', '2026-06-26', '2026-07-03', '2026-07-03', '2026-07-03', 'Manager Second Reimbursement Request', 2300.00, 'payroll', NULL, '0392365625', 'This is a test request.', 'approved', 'approver@dummy.com', NULL, NULL, NULL, 'Rejection from ACCOUNTING', NULL, '2026-06-26 02:12:24', '2026-07-14 08:52:31', NULL, 'Jessie Accounting', '2026-06-26 10:57:58', 'Try to request again.', ''),
(15, 'RI-202606-6076', 'Accounting Dummy', 5, 'EPC', '2026-06-26', '2026-07-03', '2026-07-03', '2026-07-03', 'Reimbursement from the ACCOUNTING', 33493.00, 'payroll', NULL, '0392365625', NULL, 'approved', 'accounting@dummy.com', 'Admin', NULL, '2026-07-07 07:47:13', NULL, NULL, '2026-06-26 10:48:39', '2026-07-14 08:52:41', NULL, NULL, NULL, NULL, '');

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

--
-- Dumping data for table `reimbursement_attachments`
--

INSERT INTO `reimbursement_attachments` (`id`, `reimbursement_id`, `file_name`, `file_path`, `file_type`, `file_size`, `uploaded_by`, `created_at`) VALUES
(21, 5, 'CDM Flowchart.png', '/uploads/reimbursements/RI-202606-3257/1781674624530-CDM_Flowchart.png', 'image/png', 241098, 4, '2026-06-17 05:37:04'),
(22, 13, 'Scanned 02 - LAWSON.pdf', '/uploads/reimbursements/RI-202606-0262/1782381452802-Scanned_02_-_LAWSON.pdf', 'application/pdf', 100295, 5, '2026-06-25 09:57:32'),
(23, 13, 'Scanned 03 - MERCURY.pdf', '/uploads/reimbursements/RI-202606-0262/1782381452832-Scanned_03_-_MERCURY.pdf', 'application/pdf', 811277, 5, '2026-06-25 09:57:32'),
(24, 13, 'Scanned 04 - DUNKIN.pdf', '/uploads/reimbursements/RI-202606-0262/1782381452859-Scanned_04_-_DUNKIN.pdf', 'application/pdf', 904327, 5, '2026-06-25 09:57:32'),
(25, 13, 'Scanned 05 - DUNKIN.pdf', '/uploads/reimbursements/RI-202606-0262/1782381452888-Scanned_05_-_DUNKIN.pdf', 'application/pdf', 1099689, 5, '2026-06-25 09:57:32'),
(26, 13, 'Scanned DUNKIN.pdf', '/uploads/reimbursements/RI-202606-0262/1782381452921-Scanned_DUNKIN.pdf', 'application/pdf', 2001120, 5, '2026-06-25 09:57:32'),
(27, 13, 'Scanned 01 - 7-ELEVEN.pdf', '/uploads/reimbursements/RI-202606-0262/1782381452961-Scanned_01_-_7-ELEVEN.pdf', 'application/pdf', 600378, 5, '2026-06-25 09:57:32');

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

--
-- Dumping data for table `reimbursement_expenses`
--

INSERT INTO `reimbursement_expenses` (`id`, `reimbursement_id`, `expense_date`, `particular`, `actual_amount`, `receipt_id`, `receipt_number`, `tin`, `vendor_name`, `vat_type`, `address`, `vatable_sales`, `vat_amount`, `zero_rated_sales`, `vat_exempt_sales`, `created_at`, `updated_at`) VALUES
(147, 5, '2026-06-22', 'Food Allowance', 247.00, 13, '00-00040988', '008-789-736-00246', 'LAWSON', 'VAT', 'Makati', 220.54, 26.46, 0.00, 0.00, '2026-06-22 10:28:44', '2026-06-22 10:28:44'),
(148, 5, '2026-06-22', 'Extra Expenses', 50.00, 14, '2038602', '000-390-189-1100', '7-ELEVEN', 'VAT', 'Paranaque', 44.64, 5.36, 0.00, 0.00, '2026-06-22 10:28:44', '2026-06-22 10:28:44'),
(157, 13, '2026-07-02', 'Food Expenses', 50.00, 18, '2038602', '000-390-189-1100', '7-eleven', 'VAT', 'Paranaque', 44.64, 5.36, 0.00, 0.00, '2026-06-25 09:57:32', '2026-06-25 09:57:32'),
(158, 13, '2026-07-02', 'Other Expenses', 247.00, 19, '00-00040988', '008-789-736-00246', 'LAWSON', 'VAT', 'Makati', 220.54, 26.46, 0.00, 0.00, '2026-06-25 09:57:32', '2026-06-25 09:57:32'),
(159, 13, '2026-07-02', 'Snack Expenses', 230.00, 20, '000000000033493', '000-122-565-00308', 'DUNKIN\' DONUTS', 'VAT', 'PASAY', 205.36, 24.64, 0.00, 0.00, '2026-06-25 09:57:32', '2026-06-25 09:57:32'),
(160, 13, '2026-07-02', 'Supplies', 201.00, 21, '000000000033492', '000-122-565-00303', 'DUNKIN\' DONUTS', 'VAT', 'SAN JUAN', 179.46, 21.54, 0.00, 0.00, '2026-06-25 09:57:32', '2026-06-25 09:57:32'),
(166, 12, '2026-06-25', 'First Particular', 230.00, 16, '000000000033493', '000-122-565-00308', 'DUNKIN DONUTS', 'VAT', 'PASAY', 205.36, 24.64, 0.00, 0.00, '2026-06-26 02:41:12', '2026-06-26 02:41:12'),
(167, 12, '2026-06-25', 'Second Particular', 201.00, 17, '000000000033492', '000-122-565-00308', 'DUNKIN DONUTS', 'VAT', 'PASAY', 179.46, 21.54, 0.00, 0.00, '2026-06-26 02:41:12', '2026-06-26 02:41:12'),
(169, 15, '2026-07-03', 'Sample Paticular', 33493.00, 25, '000000000033493', '000-122-565-00308', 'DUNKIN® DONUTS', 'VAT', 'PASAY', 205.36, 24.64, 0.00, 0.00, '2026-06-26 10:48:39', '2026-06-26 10:48:39'),
(171, 14, '2026-07-03', 'Sample Expenses', 2300.00, 24, '000000000033493', '000-122-565-00308', 'DUNKIN\' DONUTS', 'VAT', 'PASAY', 205.36, 24.64, 0.00, 0.00, '2026-07-13 03:14:26', '2026-07-13 03:14:26');

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

--
-- Dumping data for table `reimbursement_itinerary`
--

INSERT INTO `reimbursement_itinerary` (`id`, `reimbursement_id`, `travel_date`, `store_name`, `amount`, `receipt_id`, `transport_from`, `transport_to`, `transport_mode`, `created_at`, `updated_at`) VALUES
(34, 5, '2026-06-22', 'SM BICUTAN', 37.00, 15, 'HOUSE', 'SEVERINA TODAS TERMINAL', 'TRICYCLE', '2026-06-22 10:28:44', '2026-06-22 10:28:44'),
(37, 13, '2026-07-02', 'SM BICUTAN', 150.00, 22, 'HOUSE', 'SM BICUTAN', 'MOVE IT', '2026-06-25 09:57:32', '2026-06-25 09:57:32'),
(38, 13, '2026-07-02', 'SM BICUTAN', 200.00, 23, 'SM BICUTAN', 'HOUSE', 'MOVE IT', '2026-06-25 09:57:32', '2026-06-25 09:57:32');

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

--
-- Dumping data for table `reimbursement_receipts`
--

INSERT INTO `reimbursement_receipts` (`id`, `reimbursement_id`, `file_name`, `file_path`, `file_type`, `file_size`, `source_id`, `source_type`, `uploaded_by`, `created_at`) VALUES
(13, 5, 'Scanned LAWSON.jpg', '/uploads/reimbursements/RI-202606-3257/1781503270156-Scanned_LAWSON.jpg', 'image/jpeg', 8072397, NULL, 'expense', 4, '2026-06-15 06:01:10'),
(14, 5, 'Scanned 7-11.jpg', '/uploads/reimbursements/RI-202606-3257/1781503270270-Scanned_7-11.jpg', 'image/jpeg', 6467930, NULL, 'expense', 4, '2026-06-15 06:01:10'),
(15, 5, '7-11.jpg', '/uploads/reimbursements/RI-202606-3257/1781503270355-7-11.jpg', 'image/jpeg', 2592643, NULL, 'itinerary', 4, '2026-06-15 06:01:10'),
(16, 12, '4. DUNKIN.jpg', '/uploads/reimbursements/RI-202606-9642/1782354197874-4._DUNKIN.jpg', 'image/jpeg', 11619803, NULL, 'expense', 4, '2026-06-25 02:23:18'),
(17, 12, '5. DUNKIN.jpg', '/uploads/reimbursements/RI-202606-9642/1782354198011-5._DUNKIN.jpg', 'image/jpeg', 14322366, NULL, 'expense', 4, '2026-06-25 02:23:18'),
(18, 13, '1. Scanned 7-ELEVEN.jpg', '/uploads/reimbursements/RI-202606-0262/1782381452216-1._Scanned_7-ELEVEN.jpg', 'image/jpeg', 6467930, NULL, 'expense', 5, '2026-06-25 09:57:32'),
(19, 13, '2. Scanned LAWSON.jpg', '/uploads/reimbursements/RI-202606-0262/1782381452337-2._Scanned_LAWSON.jpg', 'image/jpeg', 8072397, NULL, 'expense', 5, '2026-06-25 09:57:32'),
(20, 13, '4. DUNKIN.jpg', '/uploads/reimbursements/RI-202606-0262/1782381452442-4._DUNKIN.jpg', 'image/jpeg', 11619803, NULL, 'expense', 5, '2026-06-25 09:57:32'),
(21, 13, '5. DUNKIN.jpg', '/uploads/reimbursements/RI-202606-0262/1782381452577-5._DUNKIN.jpg', 'image/jpeg', 14322366, NULL, 'expense', 5, '2026-06-25 09:57:32'),
(22, 13, '1. 7-ELEVEN.jpg', '/uploads/reimbursements/RI-202606-0262/1782381452676-1._7-ELEVEN.jpg', 'image/jpeg', 2592643, NULL, 'itinerary', 5, '2026-06-25 09:57:32'),
(23, 13, '2. LAWSON.jpg', '/uploads/reimbursements/RI-202606-0262/1782381452706-2._LAWSON.jpg', 'image/jpeg', 9022302, NULL, 'itinerary', 5, '2026-06-25 09:57:32'),
(24, 14, '4. DUNKIN.jpg', '/uploads/reimbursements/RI-202606-1492/1782439944571-4._DUNKIN.jpg', 'image/jpeg', 11619803, NULL, 'expense', 5, '2026-06-26 02:12:24'),
(25, 15, '4. DUNKIN.jpg', '/uploads/reimbursements/RI-202606-6076/1782470919677-4._DUNKIN.jpg', 'image/jpeg', 11619803, NULL, 'expense', 3, '2026-06-26 10:48:39');

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
(1, 5, 'ARF', 'Accounting Revolving Fund', 13350.00, '2026-07-13 06:16:40', '2026-07-14 08:59:06'),
(2, 8, 'ORF', 'Operations Revolving Fund', 8500.00, '2026-07-13 06:16:40', '2026-07-13 07:46:36');

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
  `approver_id` int(10) UNSIGNED NOT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `revolving_funds_history`
--

INSERT INTO `revolving_funds_history` (`id`, `transaction_type`, `transaction_id`, `transaction_number`, `revolving_fund_id`, `funding_code`, `total_amount`, `deducted_amount`, `replenish_amount`, `balance_before`, `balance_after`, `approver_id`, `created_at`) VALUES
(1, 'cash_advance', 55, 'CA-202607-7625', 2, 'ORF', 1500.00, 1500.00, NULL, 10000.00, 8500.00, 5, '2026-07-13 07:46:36'),
(2, 'cash_advance', 44, 'CA-202606-7133', 1, 'ARF', 1000.00, 1000.00, NULL, 10000.00, 9000.00, 3, '2026-07-13 09:47:01'),
(3, 'replenish', 0, '1212-55821-544', 1, 'ARF', 0.00, 0.00, 5000.00, 9000.00, 14000.00, 3, '2026-07-14 05:18:07'),
(4, 'cash_advance', 43, 'CA-202606-9457', 1, 'ARF', 650.00, 650.00, NULL, 14000.00, 13350.00, 3, '2026-07-14 08:59:06');

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
(1, 'Temp User', 'temp.user@example.com', '$2a$10$OJ319I3NRCCcvmjbkvP7Pe3MO9yJp63UQmJHSi/dZvILRWrDgP4Uy', 'employee', NULL, 'FINANCE', NULL, NULL, NULL, 1, '2025-12-12 08:09:08', '2025-12-29 05:15:16', '00b312c9471010e0365f30fabf77b3511cfc26d942c7bde9e8d32e245f121fad', '2025-12-15 06:21:19'),
(2, 'Admin Dummy', 'admin@dummy.com', '$2a$10$zaWTpbcBjGYBdvHUtc2b/eliu.Yx4Byj.9IinK81p.xLc7dEd6z0G', 'admin', 'NBFI', 'MIS', '0392365625', '091326532983', 'Admin Account', 1, '2025-12-15 03:41:08', '2026-07-10 08:00:54', NULL, NULL),
(3, 'Accounting Dummy', 'accounting@dummy.com', '$2a$10$fNMc4tb1C0CRFr/jVLJ/3OfPQ9VAhst0TeGFTUlryCMgAJZDKhmdW', 'accounting', 'EPC', 'FINANCE', '0392365625', '091326532983', 'EPC Roland Alavera', 1, '2025-12-15 03:47:57', '2026-07-10 06:19:53', NULL, NULL),
(4, 'Requestor Dummy', 'requestor@dummy.com', '$2a$10$Bu7wD2BWzv7AXs0E8Usnk.QHu00Phww/N5EM5D7JZUlPfIIwIk1uG', 'employee', 'NBFI', 'OPERATIONS', '000-1245-55455', '09103459681', 'Roland Alavera', 1, '2025-12-15 05:27:53', '2026-07-13 07:37:12', 'de95dae62f93387540cc9f635a9763eb58a0135fc21c694c6ca66d9ad23be828', '2026-07-07 12:04:16'),
(5, 'Approver Dummy', 'approver@dummy.com', '$2a$10$pfzJYHs2BN6LzbaQf7Gxv.uvnAnrTuRGCNk/5Kk95z8n/OqYPKYgK', 'manager', 'NBFI', 'OPERATIONS', '091231763', '09103213123', 'Mike Approver', 1, '2026-01-19 09:25:31', '2026-07-13 07:37:22', NULL, NULL);

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=348;

--
-- AUTO_INCREMENT for table `cash_advances`
--
ALTER TABLE `cash_advances`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT for table `cash_advance_attachments`
--
ALTER TABLE `cash_advance_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

--
-- AUTO_INCREMENT for table `cash_advance_breakdown`
--
ALTER TABLE `cash_advance_breakdown`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=527;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `liquidations`
--
ALTER TABLE `liquidations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `liquidation_attachments`
--
ALTER TABLE `liquidation_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `liquidation_expenses`
--
ALTER TABLE `liquidation_expenses`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=149;

--
-- AUTO_INCREMENT for table `liquidation_itinerary`
--
ALTER TABLE `liquidation_itinerary`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `liquidation_receipts`
--
ALTER TABLE `liquidation_receipts`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `otp_verifications`
--
ALTER TABLE `otp_verifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `reimbursements`
--
ALTER TABLE `reimbursements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `reimbursement_attachments`
--
ALTER TABLE `reimbursement_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `reimbursement_expenses`
--
ALTER TABLE `reimbursement_expenses`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=172;

--
-- AUTO_INCREMENT for table `reimbursement_itinerary`
--
ALTER TABLE `reimbursement_itinerary`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `reimbursement_receipts`
--
ALTER TABLE `reimbursement_receipts`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `revolving_funds`
--
ALTER TABLE `revolving_funds`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `revolving_funds_history`
--
ALTER TABLE `revolving_funds_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `uploads`
--
ALTER TABLE `uploads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
