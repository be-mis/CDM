const express = require('express');
const router  = express.Router();
const auth = require('../middleware/auth');

const {
  createReimbursement,
  updateReimbursement,
  getReimbursements,
  getReimbursementById,
  addAttachment,
  deleteAttachment,
  deleteReimbursement,
} = require('../controllers/reimbursementController');

// All routes require authentication
router.use(auth);

// ─── Reimbursement CRUD ───────────────────────────────────────────────────────
router.get   ('/',    getReimbursements);      // list (current user)
router.post  ('/',    createReimbursement);    // create
router.get   ('/:id', getReimbursementById);   // read one
router.put   ('/:id', updateReimbursement);    // update / phase-3 re-save
router.delete('/:id', deleteReimbursement);    // soft-cancel

// ─── Supporting-document attachments ─────────────────────────────────────────
router.post  ('/:id/attachments',        addAttachment);
router.delete('/:id/attachments/:attId', deleteAttachment);

module.exports = router;