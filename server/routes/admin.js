// server/routes/admin.js

const router = require('express').Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const bcrypt = require('bcryptjs');

// All routes in this file are protected and require admin access
// We apply the middlewares at the router level
router.use(verifyToken);
router.use(verifyAdmin);

// --- Admin Dashboard Statistics ---
router.get('/stats', async (req, res) => {
  try {
    // We run multiple queries in parallel for efficiency
    const [userCount, taskCount, tasksByStatus] = await Promise.all([
      // 1. Get total number of users
      db.query('SELECT COUNT(*) FROM users'),

      // 2. Get total number of tasks
      db.query('SELECT COUNT(*) FROM tasks'),

      // 3. Get task counts grouped by status
      db.query('SELECT status, COUNT(*) FROM tasks GROUP BY status')
    ]);

    // Format the tasksByStatus result into a nice object
    const statusCounts = {};
    tasksByStatus.rows.forEach(row => {
      statusCounts[row.status] = parseInt(row.count, 10);
    });

    res.json({
      totalUsers: parseInt(userCount.rows[0].count, 10),
      totalTasks: parseInt(taskCount.rows[0].count, 10),
      tasksByStatus: {
        Pending: statusCounts.Pending || 0,
        'In Progress': statusCounts['In Progress'] || 0,
        Completed: statusCounts.Completed || 0,
      }
    });

  } catch (err) {
    console.error('Admin Stats Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- Get All Users (for admin) ---
router.get('/users', async (req, res) => {
  try {
    // Get all users, but do NOT send their password hashes
    const users = await db.query(
      'SELECT user_id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users.rows);
  } catch (err) {
    console.error('Admin Get Users Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- Get All Tasks (for admin) ---
router.get('/tasks', async (req, res) => {
  try {
    // Get all tasks with their assignee's name
    const tasks = await db.query(
      `SELECT t.*, u.username as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.user_id
       ORDER BY t.created_at DESC`
    );
    res.json(tasks.rows);
  } catch (err) {
    console.error('Admin Get Tasks Error:', err.message);
    res.status(500).send('Server Error');
  }
});



// --- Create a user (admin can create another admin) ---
// POST /api/admin/users
// body: { username, email, password, role? }
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role = 'ADMIN' } = req.body;

    // Prevent invalid roles
    const normalizedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    // Check existing
    const existing = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const created = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role, created_at',
      [username, email, hash, normalizedRole]
    );

    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error('Admin Create User Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- Update role of a user ---
// PUT /api/admin/users/:id/role  { role: 'ADMIN'|'USER' }
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    const updated = await db.query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, username, email, role, created_at',
      [role, id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Admin Update Role Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
