const express = require('express');
const router = express.Router();
const liquidationController = require('../controllers/liquidationController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get pending liquidations needed (for accounting dashboard)
router.get('/pending/list', liquidationController.getPendingLiquidations);

// Create new liquidation (draft or submit)
router.post('/', liquidationController.createLiquidation);

// Update existing liquidation
router.put('/:id', liquidationController.updateLiquidation);

// Get all liquidations for current user
router.get('/', liquidationController.getLiquidations);

// Get single liquidation by ID
router.get('/:id', liquidationController.getLiquidationById);

// Delete liquidation (only drafts)
router.delete('/:id', liquidationController.deleteLiquidation);

// Add attachment to liquidation
router.post('/:liquidationId/attachments', liquidationController.addAttachment);
// Delete attachment
router.delete('/:liquidationId/attachments/:attachmentId', liquidationController.deleteAttachment);

// Cancel pending liquidation
router.post('/:id/cancel', liquidationController.cancelLiquidation);

module.exports = router;
