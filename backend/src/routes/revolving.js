const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const revolvingFundsController = require('../controllers/revolvingFundsController');

// Role check (accounting/admin only) is enforced inside the controller,
// consistent with the rest of the codebase.
router.get('/revolving-funds', requireAuth, revolvingFundsController.getAllFunds);
router.get('/revolving-funds/history', requireAuth, revolvingFundsController.getAllHistory);
router.get('/revolving-funds/:id', requireAuth, revolvingFundsController.getFundById);
router.get('/revolving-funds/:id/history', requireAuth, revolvingFundsController.getFundHistory);
router.post('/revolving-funds/:id/replenish', requireAuth, revolvingFundsController.replenishFund);

module.exports = router;