process.env.TZ = 'Asia/Manila';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const departmentsRoutes = require('./routes/departments');
const cashAdvanceRoutes = require('./routes/cashAdvance');
const liquidationRoutes = require('./routes/liquidation');
const reimbursementRoutes = require('./routes/reimbursement');
const approvalRoutes = require('./routes/approvals');
const disbursementRoutes = require('./routes/disbursements');
const auditLogsRoutes = require('./routes/auditLogs');
const usersRoutes = require('./routes/users');
const revolvingFundsRoutes = require('./routes/revolving');
const path = require('path');
// Cleanup utility is loaded only when explicitly enabled via env

const app = express();

// CORS Configuration - MUST be before helmet
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3021')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: frontendOrigins,
  credentials: true
}));

// Helmet with crossOriginResourcePolicy
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// ...existing code...

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/cash-advances', cashAdvanceRoutes);
app.use('/api/liquidations', liquidationRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/disbursements', disbursementRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', revolvingFundsRoutes);

// Cleanup features are hidden by default. To enable, set ENABLE_CLEANUP=true
if (String(process.env.ENABLE_CLEANUP).toLowerCase() === 'true') {
  try {
    const { cleanupUploads } = require('./utils/cleanupUploads');

    // Admin endpoint to trigger cleanup (requires header x-cleanup-secret matching CLEANUP_SECRET)
    app.post('/api/admin/cleanup-uploads', async (req, res) => {
      const secret = req.headers['x-cleanup-secret'];
      if (!process.env.CLEANUP_SECRET || secret !== process.env.CLEANUP_SECRET) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      try {
        const result = await cleanupUploads({ dryRun: false, retentionHours: process.env.CLEANUP_RETENTION_HOURS });
        res.status(200).json({ success: true, message: 'Cleanup completed', result });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Cleanup failed', error: err.message });
      }
    });

    // Schedule periodic cleanup
    const intervalMinutes = Number(process.env.CLEANUP_INTERVAL_MINUTES || 60);
    if (intervalMinutes > 0) {
      setInterval(async () => {
        try {
          console.log('Running scheduled uploads cleanup...');
          const r = await cleanupUploads({ dryRun: false, retentionHours: process.env.CLEANUP_RETENTION_HOURS });
          console.log('Uploads cleanup result:', r);
        } catch (err) {
          console.error('Scheduled cleanup error:', err.message);
        }
      }, intervalMinutes * 60 * 1000);
    }
  } catch (err) {
    console.warn('Cleanup utility not available or failed to load', err.message);
  }
}

// Liquidation reminder alerts - checks daily for overdue cash advances
if (String(process.env.ENABLE_LIQUIDATION_ALERTS).toLowerCase() !== 'false') {
  try {
    const { checkOverdueLiquidations } = require('./utils/liquidationReminder');

    // Run once on startup after a short delay to let DB warm up
    setTimeout(async () => {
      try {
        console.log('Running initial liquidation reminder check...');
        const result = await checkOverdueLiquidations();
        console.log('Initial liquidation reminder result:', result);
      } catch (err) {
        console.error('Initial liquidation reminder error:', err.message);
      }
    }, 30 * 1000); // 30 seconds after startup

    // Run every 24 hours
    setInterval(async () => {
      try {
        console.log('Running scheduled liquidation reminder check...');
        const result = await checkOverdueLiquidations();
        console.log('Scheduled liquidation reminder result:', result);
      } catch (err) {
        console.error('Scheduled liquidation reminder error:', err.message);
      }
    }, 24 * 60 * 60 * 1000);

    console.log('Liquidation alert system enabled (daily check).');
  } catch (err) {
    console.warn('Liquidation reminder utility not available:', err.message);
  }
}

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Server listening at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please kill the process or use a different port.`);
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});