const pool = require('../config/db');

/**
 * Approvals Controller
 * Handles fetching and processing requests that need approval
 */

// Get all requests pending approval for the current logged-in approver
const getPendingApprovals = async (req, res) => {
    try {
        const userEmail = req.user.email;

        // 1. Get departments this user is authorized to approve
        const [authDeptRows] = await pool.query(
            `SELECT d.id, d.name 
       FROM approver a
       JOIN departments d ON a.department = d.name
       WHERE a.email = ?`,
            [userEmail]
        );

        if (authDeptRows.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    cashAdvances: [],
                    liquidations: [],
                    reimbursements: []
                }
            });
        }

        const deptIds = authDeptRows.map(d => d.id);

        // 2. Fetch pending Cash Advances with calculated total from items
        const [cashAdvances] = await pool.query(
            `SELECT ca.*, d.name as department_name,
             COALESCE((SELECT SUM(estimated_amount) FROM cash_advance_items WHERE cash_advance_id = ca.id), ca.requested_amount) as calculated_amount
       FROM cash_advances ca
       JOIN departments d ON ca.department_id = d.id
       WHERE ca.status = 'pending' AND ca.department_id IN (?)`,
            [deptIds]
        );

        // 3. Fetch pending Liquidations
        const [liquidations] = await pool.query(
            `SELECT l.*, d.name as department_name
       FROM liquidations l
       JOIN departments d ON l.department_id = d.id
       WHERE l.status = 'pending' AND l.department_id IN (?)`,
            [deptIds]
        );

        // 4. Fetch pending Reimbursements
        const [reimbursements] = await pool.query(
            `SELECT r.*, d.name as department_name
       FROM reimbursements r
       JOIN departments d ON r.department_id = d.id
       WHERE r.status = 'pending' AND r.department_id IN (?)`,
            [deptIds]
        );

        res.status(200).json({
            success: true,
            data: {
                cashAdvances,
                liquidations,
                reimbursements
            }
        });

    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending approvals',
            error: error.message
        });
    }
};

// Approve or Reject a request
const processApproval = async (req, res) => {
    const { type, id, action, remarks } = req.body;
    const userEmail = req.user.email;
    const userName = req.user.name;

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    try {
        let tableName = '';
        if (type === 'cash-advance') tableName = 'cash_advances';
        else if (type === 'liquidation') tableName = 'liquidations';
        else if (type === 'reimbursement') tableName = 'reimbursements';
        else return res.status(400).json({ success: false, message: 'Invalid request type' });

        // Verify if user is authorized to approve this request (department check)
        const [requestRows] = await pool.query(`SELECT department_id FROM ${tableName} WHERE id = ?`, [id]);

        if (requestRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const deptId = requestRows[0].department_id;

        const [auth] = await pool.query(
            `SELECT a.id, a.department, d.name as dept_name
       FROM approver a
       JOIN departments d ON a.department = d.name
       WHERE a.email = ? AND d.id = ?`,
            [userEmail, deptId]
        );

        if (auth.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to approve requests from this department'
            });
        }

        // Perform update
        const [result] = await pool.query(
            `UPDATE ${tableName} 
       SET status = ?, approved_by = ?, approved_at = NOW(), remarks = ?
       WHERE id = ?`,
            [newStatus, userName, remarks || null, id]
        );

        res.status(200).json({
            success: true,
            message: `Request ${action}d successfully`
        });

    } catch (error) {
        console.error('Error processing approval:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing approval',
            error: error.message
        });
    }
};

module.exports = {
    getPendingApprovals,
    processApproval
};
