// server/routes/tasks.js

const router = require('express').Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const multer = require('multer');

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });

// --- Task API Routes ---

/**
 * GET ALL TASKS FOR THE LOGGED-IN USER
 * (Includes filtering, search, and pagination)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // Get query parameters from the request
    const { status, search, page = 1, limit = 10 } = req.query;

    // --- 1. Build the Data Query ---
    let baseQuery = `
      SELECT t.*, u.username as assignee_name
      FROM tasks t
      JOIN users u ON t.assignee_id = u.user_id
      WHERE t.assignee_id = $1
    `;
    const queryParams = [req.user.id];

    // --- 2. Build the Count Query ---
    let countQuery = `
      SELECT COUNT(*) 
      FROM tasks t
      WHERE t.assignee_id = $1
    `;
    const countParams = [req.user.id];

    // --- 3. Add filters dynamically ---
    if (status) {
      queryParams.push(status);
      countParams.push(status);
      const paramIndex = queryParams.length;
      baseQuery += ` AND t.status = $${paramIndex}`;
      countQuery += ` AND t.status = $${paramIndex}`;
    }

    if (search) {
      queryParams.push(`%${search}%`); // Add wildcards
      countParams.push(`%${search}%`);
      const paramIndex = queryParams.length;
      baseQuery += ` AND t.title ILIKE $${paramIndex}`; // ILIKE = case-insensitive
      countQuery += ` AND t.title ILIKE $${paramIndex}`;
    }

    // --- 4. Add sorting ---
    baseQuery += ' ORDER BY t.due_date ASC, t.created_at DESC';

    // --- 5. Add pagination ---
    const pageNumber = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);
    const offset = (pageNumber - 1) * pageLimit;

    queryParams.push(pageLimit);
    baseQuery += ` LIMIT $${queryParams.length}`;
    queryParams.push(offset);
    baseQuery += ` OFFSET $${queryParams.length}`;

    // --- 6. Run the queries ---
    const [tasksResult, countResult] = await Promise.all([
      db.query(baseQuery, queryParams),
      db.query(countQuery, countParams) // Run count without LIMIT/OFFSET
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / pageLimit);

    // --- 7. Send the response ---
    res.json({
      tasks: tasksResult.rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNumber,
        itemsPerPage: pageLimit,
      },
    });

  } catch (err) {
    console.error('Get Tasks Error:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * CREATE A NEW TASK (Admin Only)
 */
router.post('/', [verifyToken, verifyAdmin, upload.single('file')], async (req, res) => {
  try {
    const { title, description, status, due_date, assignee_id } = req.body;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const newTask = await db.query(
      `INSERT INTO tasks (title, description, status, due_date, assignee_id, file_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, status, due_date, assignee_id, filePath]
    );

    res.json(newTask.rows[0]);
  } catch (err) {
    console.error('Create Task Error:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * UPDATE A TASK (Admin or Assigned User)
 * This is the simplified, explicit fix for your bug.
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id: taskId } = req.params; // Task ID from URL
    const { id: userId, role } = req.user; // Logged-in user info

    // Get all 6 fields from the body
    const {
      title,
      description,
      status,
      due_date,
      assignee_id,
      requestMessage, // Handle both naming conventions
      request_message
    } = req.body;

    // Set the request message, defaulting to null
    const reqMsg = requestMessage || request_message || null;

    // --- 1. PERMISSION CHECK ---
    const taskResult = await db.query('SELECT * FROM tasks WHERE task_id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    const task = taskResult.rows[0];

    // Allow update ONLY if user is an ADMIN or the task's ASSIGNEE
    if (role !== 'ADMIN' && task.assignee_id !== userId) {
      return res.status(403).json({ message: 'User not authorized.' });
    }

    // --- 2. RUN THE UPDATE ---
    // We explicitly list all fields to avoid complex dynamic queries.
    const updatedTask = await db.query(
      `UPDATE tasks
       SET title = $1, 
           description = $2, 
           status = $3, 
           due_date = $4, 
           assignee_id = $5,
           request_message = $6
       WHERE task_id = $7
       RETURNING *`,
      [title, description, status, due_date, assignee_id, reqMsg, taskId]
    );

    // 3. SEND THE CORRECT, FRESH DATA BACK
    res.json(updatedTask.rows[0]);

  } catch (err) {
    console.error('Update Task Error:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * DELETE A TASK (Admin or Assigned User)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id: taskId } = req.params; // Task ID from URL
    const { id: userId, role } = req.user; // Logged-in user info

    // --- 1. PERMISSION CHECK ---
    const taskResult = await db.query('SELECT * FROM tasks WHERE task_id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    const task = taskResult.rows[0];

    // Allow delete ONLY if user is an ADMIN or the task's ASSIGNEE
    if (role !== 'ADMIN' && task.assignee_id !== userId) {
      return res.status(403).json({ message: 'User not authorized.' });
    }

    // --- 2. RUN THE DELETE ---
    await db.query('DELETE FROM tasks WHERE task_id = $1', [taskId]);

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Delete Task Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;