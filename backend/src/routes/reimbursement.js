const express = require('express');
const router = express.Router();
const reimbursementController = require('../controllers/reimbursementController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new reimbursement (draft or submit)
router.post('/', reimbursementController.createReimbursement);

// Update existing reimbursement
router.put('/:id', reimbursementController.updateReimbursement);

// Get all reimbursements for current user
router.get('/', reimbursementController.getReimbursements);

// Get single reimbursement by ID
router.get('/:id', reimbursementController.getReimbursementById);

// Add attachment to reimbursement
router.post('/:reimbursementId/attachments', reimbursementController.addAttachment);
// Delete attachment
router.delete('/:reimbursementId/attachments/:attachmentId', reimbursementController.deleteAttachment);

// Cancel pending reimbursement
router.post('/:id/cancel', reimbursementController.cancelReimbursement);

// Delete reimbursement (only drafts)
router.delete('/:id', reimbursementController.deleteReimbursement);

module.exports = router;
