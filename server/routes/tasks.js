// server/routes/tasks.js

const router = require('express').Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const multer = require('multer');

// --- Multer Configuration for File Uploads ---

// Set up where to store the files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Store in the 'uploads' folder
  },
  filename: function (req, file, cb) {
    // Create a unique filename: timestamp + original name
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Initialize multer with the storage configuration
const upload = multer({ storage: storage });

// --- Task API Routes ---

// CREATE A NEW TASK
// This route is protected by verifyToken
// It uses upload.single('file') to handle one file from a field named 'file'
router.post('/', [verifyToken, upload.single('file')], async (req, res) => {
  try {
    const { title, description, status, due_date, assignee_id } = req.body;

    // Get the logged-in user's ID from the token
    const creator_id = req.user.id; // We have this, but aren't using it yet. That's ok.

    // Get the file path if a file was uploaded
    // 'req.file.path' will be like 'uploads/1678886400000-document.pdf'
    // We use 'path.replace' to make sure paths are stored consistently (using /)
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

// GET ALL TASKS FOR THE LOGGED-IN USER
// This route is protected
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

    // We will store our query parameters in this array
    const queryParams = [req.user.id];

    // --- 2. Build the Count Query ---
    // We need a separate query to get the *total* number of items
    // that match the filters, so we can calculate total pages.
    let countQuery = `
      SELECT COUNT(*) 
      FROM tasks t
      WHERE t.assignee_id = $1
    `;

    // --- 3. Add filters dynamically ---

    // Add STATUS filter
    if (status) {
      queryParams.push(status);
      baseQuery += ` AND t.status = $${queryParams.length}`;
      countQuery += ` AND t.status = $${queryParams.length}`;
    }

    // Add SEARCH filter (case-insensitive)
    if (search) {
      queryParams.push(`%${search}%`); // Add wildcards for partial matching
      baseQuery += ` AND t.title ILIKE $${queryParams.length}`; // ILIKE is case-insensitive
      countQuery += ` AND t.title ILIKE $${queryParams.length}`;
    }

    // --- 4. Add sorting ---
    baseQuery += ' ORDER BY t.created_at DESC';

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
      db.query(countQuery, queryParams.slice(0, -2)) // Run count without LIMIT/OFFSET params
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

// UPDATE A TASK
// This route is protected
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // Task ID
    const { title, description, status, due_date, assignee_id } = req.body;

    // We check that the user updating the task is the one it's assigned to
    // (In a real app, you might also allow an ADMIN)
    const updatedTask = await db.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, due_date = $4, assignee_id = $5
       WHERE task_id = $6 AND assignee_id = $7
       RETURNING *`,
      [title, description, status, due_date, assignee_id, id, req.user.id]
    );

    if (updatedTask.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Task not found or user not authorized.' });
    }

    res.json(updatedTask.rows[0]);
  } catch (err) { // <--- THIS WAS THE INCOMPLETE LINE
    // --- START OF FIXED CODE ---
    console.error('Update Task Error:', err.message);
    res.status(500).send('Server Error');
    // --- END OF FIXED CODE ---
  }
});

// DELETE A TASK
// This route is protected
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // Task ID

    const deleteTask = await db.query(
      'DELETE FROM tasks WHERE task_id = $1 AND assignee_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (deleteTask.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Task not found or user not authorized.' });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Delete Task Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;