const pool = require('../config/db');

/**
 * Disbursements Controller
 * Handles fetching and processing approved requests ready for fund release by Accounting
 */

// Get all approved requests pending disbursement/release
const getPendingDisbursements = async (req, res) => {
    try {
        const [cashAdvances] = await pool.query(
            `SELECT ca.*, d.name as department_name,
             COALESCE((SELECT SUM(estimated_amount) FROM cash_advance_items WHERE cash_advance_id = ca.id), ca.requested_amount) as calculated_amount
       FROM cash_advances ca
       JOIN departments d ON ca.department_id = d.id
       WHERE ca.status IN ('approved', 'released', 'rejected')
       ORDER BY ca.created_at DESC`
        );

        // Fetch approved Liquidations
        const [liquidations] = await pool.query(
            `SELECT l.*, d.name as department_name,
             ca.advance_number as cash_advance_number
       FROM liquidations l
       JOIN departments d ON l.department_id = d.id
       LEFT JOIN cash_advances ca ON l.cash_advance_id = ca.id
       WHERE l.status IN ('approved', 'released', 'rejected')
       ORDER BY l.created_at DESC`
        );

        // Fetch approved Reimbursements
        const [reimbursements] = await pool.query(
            `SELECT r.*, d.name as department_name
       FROM reimbursements r
       JOIN departments d ON r.department_id = d.id
       WHERE r.status IN ('approved', 'released', 'rejected')
       ORDER BY r.created_at DESC`
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
        console.error('Error fetching pending disbursements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending disbursements',
            error: error.message
        });
    }
};

// Process disbursement - release or reject
const processDisbursement = async (req, res) => {
    const { type, id, action, remarks } = req.body; // action: 'release' or 'reject'
    const userName = req.user.name;

    if (!['release', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action. Must be release or reject.' });
    }

    try {
        let tableName = '';
        if (type === 'cash-advance') tableName = 'cash_advances';
        else if (type === 'liquidation') tableName = 'liquidations';
        else if (type === 'reimbursement') tableName = 'reimbursements';
        else return res.status(400).json({ success: false, message: 'Invalid request type' });

        // Verify request exists and is approved
        const [request] = await pool.query(`SELECT id, status FROM ${tableName} WHERE id = ?`, [id]);
        if (request.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request[0].status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Request must be approved before processing' });
        }

        if (action === 'release') {
            // Update status to released
            await pool.query(
                `UPDATE ${tableName} 
           SET status = 'released', released_by = ?, released_at = NOW(), release_remarks = ?
           WHERE id = ?`,
                [userName, remarks || null, id]
            );

            res.status(200).json({
                success: true,
                message: 'Funds released successfully'
            });
        } else {
            // Reject - set status back to pending or rejected
            await pool.query(
                `UPDATE ${tableName} 
           SET status = 'rejected', released_by = ?, released_at = NOW(), release_remarks = ?
           WHERE id = ?`,
                [userName, remarks || null, id]
            );

            res.status(200).json({
                success: true,
                message: 'Request rejected successfully'
            });
        }

    } catch (error) {
        console.error('Error processing disbursement:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing disbursement',
            error: error.message
        });
    }
};

module.exports = {
    getPendingDisbursements,
    processDisbursement
};
