const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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

// Get revolving fund info (balance, code, description) for a department,
// used by the frontend to decide whether to show the "Use Revolving Fund?"
// option on the approval modal and what the current balance is.
// GET /approvals/revolving-fund?department_id=8
const getRevolvingFund = async (req, res) => {
    try {
        const departmentId = parseInt(req.query.department_id, 10);
        if (!departmentId) {
            return res.status(400).json({ success: false, message: 'department_id is required' });
        }

        const [rows] = await pool.query(
            `SELECT id, department, funding_code, funding_description, Amount
       FROM revolving_funds
       WHERE department = ?`,
            [departmentId]
        );

        res.status(200).json({
            success: true,
            data: rows.length > 0 ? rows[0] : null
        });
    } catch (error) {
        console.error('Error fetching revolving fund:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching revolving fund',
            error: error.message
        });
    }
};

// Which request types are allowed to draw from a revolving fund, and which
// column on each table holds that request's own reference number — matches
// revolving_funds_history.transaction_number ("reimbursement_number").
// Liquidations are intentionally excluded: they aren't part of the
// revolving_funds_history.transaction_type enum. Cash advances are also
// excluded — revolving funds may only be used for reimbursements.
const REVOLVING_FUND_ELIGIBLE_TYPES = {
    'reimbursement': { table: 'reimbursements', transactionType: 'reimbursement', numberColumn: 'reimbursement_number' },
};

// Approve or Reject a request
const processApproval = async (req, res) => {
    const { type, id, action, remarks, useRevolvingFund } = req.body;
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
        // NOTE: also pull the amount columns here so we have something to log —
        // cash_advances uses requested_amount, liquidations/reimbursements use
        // total_actual_amount. Selecting both is harmless; missing columns on a
        // given table would break the query, so we guard with table-specific SQL.
        const amountColumn = tableName === 'cash_advances' ? 'requested_amount' : 'total_actual_amount';
        const eligibility = REVOLVING_FUND_ELIGIBLE_TYPES[type];
        const numberColumn = eligibility ? eligibility.numberColumn : null;
        const [requestRows] = await pool.query(
            `SELECT department_id, ${amountColumn} AS amount${numberColumn ? `, ${numberColumn} AS transaction_number` : ''} FROM ${tableName} WHERE id = ?`,
            [id]
        );

        if (requestRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const deptId = requestRows[0].department_id;
        const requestAmount = requestRows[0].amount;
        const transactionNumber = requestRows[0].transaction_number || null;
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

        // Rejection remarks go to reject_remarks; approval remarks go to remarks
        const remarksColumn = action === 'reject' ? 'reject_remarks' : 'remarks';

        // Revolving fund path: only reachable on approval, and only for
        // reimbursements (cash advances and liquidations aren't eligible).
        const wantsRevolvingFund = action === 'approve' && (useRevolvingFund === true || useRevolvingFund === 'true');

        if (wantsRevolvingFund) {
            if (!eligibility) {
                return res.status(400).json({
                    success: false,
                    message: 'This request type cannot be funded from a revolving fund'
                });
            }

            const [fundRows] = await pool.query(
                `SELECT id, Amount, funding_code, funding_description FROM revolving_funds WHERE department = ? FOR UPDATE`,
                [deptId]
            );

            if (fundRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No revolving fund is configured for this department'
                });
            }

            const fund = fundRows[0];
            const fundBalance = parseFloat(fund.Amount);
            const amountNeeded = parseFloat(requestAmount);

            if (fundBalance < amountNeeded) {
                return res.status(400).json({
                    success: false,
                    message: 'Fund is not enough to cover the total amount requested',
                    remainingFund: fundBalance
                });
            }

            const balanceAfter = fundBalance - amountNeeded;
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                await connection.query(
                    `UPDATE ${tableName}
           SET status = ?, approved_by = ?, approved_at = NOW(), ${remarksColumn} = ?, funding_code = ?
           WHERE id = ?`,
                    [newStatus, userName, remarks || null, fund.funding_code, id]
                );

                await connection.query(
                    `UPDATE revolving_funds SET Amount = ? WHERE id = ?`,
                    [balanceAfter, fund.id]
                );

                await connection.query(
                    `INSERT INTO revolving_funds_history
             (transaction_type, transaction_id, transaction_number, revolving_fund_id, funding_code, total_amount, deducted_amount, balance_before, balance_after, approver_id, remarks, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not settled', NOW())`,
                    [
                        eligibility.transactionType,
                        id,
                        transactionNumber,
                        fund.id,
                        fund.funding_code,
                        amountNeeded,
                        amountNeeded,
                        fundBalance,
                        balanceAfter,
                        req.user.id,
                    ]
                );

                await connection.commit();
            } catch (txError) {
                await connection.rollback();
                throw txError;
            } finally {
                connection.release();
            }
        } else {
            // Perform update (no revolving fund involved)
            await pool.query(
                `UPDATE ${tableName} 
         SET status = ?, approved_by = ?, approved_at = NOW(), ${remarksColumn} = ?
         WHERE id = ?`,
                [newStatus, userName, remarks || null, id]
            );
        }

        // Log BEFORE responding, and keep it inside the same try block so any
        // logging failure still surfaces as a 500 rather than a silent gap —
        // but never after res.json() has already been sent.
        await logAudit({
            userId: req.user?.id || null,
            action: `${type}_${action}d`, // e.g. cash-advance_approved
            entity: tableName,
            entityId: id,
            details: { amount: requestAmount, remarks: remarks || null, usedRevolvingFund: wantsRevolvingFund },
            ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
        });

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
    processApproval,
    getRevolvingFund
};