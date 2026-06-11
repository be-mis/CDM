const express = require('express');
const router = express.Router();
const cashAdvanceController = require('../controllers/cashAdvanceController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new cash advance (draft or submit)
router.post('/', cashAdvanceController.createCashAdvance);

// Update existing cash advance
router.put('/:id', cashAdvanceController.updateCashAdvance);

// Get all cash advances for current user
router.get('/', cashAdvanceController.getCashAdvances);

// Get single cash advance by ID
router.get('/:id', cashAdvanceController.getCashAdvanceById);

// Delete cash advance (only drafts)
router.delete('/:id', cashAdvanceController.deleteCashAdvance);

// Add attachment to cash advance
router.post('/:cashAdvanceId/attachments', cashAdvanceController.addAttachment);
// Delete attachment
router.delete('/:cashAdvanceId/attachments/:attachmentId', cashAdvanceController.deleteAttachment);

// Cancel pending cash advance
router.post('/:id/cancel', cashAdvanceController.cancelCashAdvance);

module.exports = router;
