const pool = require('../config/db');

// Get all requests pending approval for the current logged-in approver
const getPendingApprovals = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const isAdmin = req.user.role === 'admin';

        let deptIds = null; // null = no department restriction (admin sees all)

        if (!isAdmin) {
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

            deptIds = authDeptRows.map(d => d.id);
        }

        // 2. Fetch pending Cash Advances with calculated total from items
        const [cashAdvances] = await pool.query(
            `SELECT ca.*, d.name as department_name,
             COALESCE((SELECT SUM(total_amount) FROM cash_advance_breakdown WHERE cash_advance_id = ca.id), ca.requested_amount) as calculated_amount
       FROM cash_advances ca
       JOIN departments d ON ca.department_id = d.id
       WHERE ca.status = 'pending' ${deptIds ? 'AND ca.department_id IN (?)' : ''}`,
            deptIds ? [deptIds] : []
        );

        // 3. Fetch pending Liquidations
        const [liquidations] = await pool.query(
            `SELECT l.*, d.name as department_name
       FROM liquidations l
       JOIN departments d ON l.department_id = d.id
       WHERE l.status = 'pending' ${deptIds ? 'AND l.department_id IN (?)' : ''}`,
            deptIds ? [deptIds] : []
        );

        // 4. Fetch pending Reimbursements
        const [reimbursements] = await pool.query(
            `SELECT r.*, d.name as department_name
            FROM reimbursements r
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE r.status = 'pending'
            AND r.department_id IS NOT NULL
            ${deptIds ? 'AND r.department_id IN (?)' : ''}`,
            deptIds ? [deptIds] : []
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

// Get ALL requests (all statuses) for the current logged-in approver
const getAllApprovals = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const isAdmin = req.user.role === 'admin';

        let deptIds = null; // null = no department restriction (admin sees all)

        if (!isAdmin) {
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

            deptIds = authDeptRows.map(d => d.id);
        }

        // 2. Fetch ALL Cash Advances (exclude drafts)
        const [cashAdvances] = await pool.query(
            `SELECT ca.*, d.name as department_name,
             COALESCE((SELECT SUM(total_amount) FROM cash_advance_breakdown WHERE cash_advance_id = ca.id), ca.requested_amount) as calculated_amount
       FROM cash_advances ca
       JOIN departments d ON ca.department_id = d.id
       WHERE ca.status != 'draft' ${deptIds ? 'AND ca.department_id IN (?)' : ''}`,
            deptIds ? [deptIds] : []
        );

        // 3. Fetch ALL Liquidations (exclude drafts)
        const [liquidations] = await pool.query(
            `SELECT l.*, d.name as department_name
       FROM liquidations l
       JOIN departments d ON l.department_id = d.id
       WHERE l.status != 'draft' ${deptIds ? 'AND l.department_id IN (?)' : ''}`,
            deptIds ? [deptIds] : []
        );

        // 4. Fetch ALL Reimbursements (exclude drafts)
        const [reimbursements] = await pool.query(
            `SELECT r.*, d.name as department_name
            FROM reimbursements r
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE r.department_id IS NOT NULL
            AND r.status != 'draft'
            ${deptIds ? 'AND r.department_id IN (?)' : ''}`,
            deptIds ? [deptIds] : []
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
        console.error('Error fetching all approvals:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all approvals',
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
        const isAdmin = req.user.role === 'admin';

        if (!isAdmin) {
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
        }

        // Perform update
        // Rejection remarks go to reject_remarks; approval remarks go to remarks
        const remarksColumn = action === 'reject' ? 'reject_remarks' : 'remarks';
        const [result] = await pool.query(
            `UPDATE ${tableName} 
       SET status = ?, approved_by = ?, approved_at = NOW(), ${remarksColumn} = ?
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
    getAllApprovals,
    processApproval
};