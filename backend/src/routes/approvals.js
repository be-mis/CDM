const express = require('express');
const router = express.Router();
const approvalsController = require('../controllers/approvalsController');
const verifyToken = require('../middleware/auth');

// All routes here require authentication
router.use(verifyToken);

// GET /api/approvals/pending - Get all requests pending approval for the current user
router.get('/pending', approvalsController.getPendingApprovals);

// POST /api/approvals/process - Approve or Reject a request
router.post('/process', approvalsController.processApproval);

module.exports = router;
