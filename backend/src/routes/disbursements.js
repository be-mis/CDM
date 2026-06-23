const express = require('express');
const router = express.Router();
const disbursementsController = require('../controllers/disbursementsController');
const verifyToken = require('../middleware/auth');

// All routes here require authentication
router.use(verifyToken);

// GET /api/disbursements/pending - Get all approved requests pending release
router.get('/pending', disbursementsController.getPendingDisbursements);

// POST /api/disbursements/process - Release or reject funds for a request
router.post('/process', disbursementsController.processDisbursement);

module.exports = router;