const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/departments - list departments
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM departments ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching departments', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
