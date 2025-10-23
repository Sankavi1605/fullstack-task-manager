// server/routes/tasks.js

const router = require('express').Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const multer = require('multer');

// GET ALL TASKS FOR LOGGED-IN USER
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT t.*, u.username as assignee_name
       FROM tasks t
       JOIN users u ON t.assignee_id = u.user_id
       WHERE t.assignee_id = $1
       ORDER BY t.due_date ASC`,
      [userId]
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('Get Tasks Error:', err.message);
    res.status(500).send('Server Error');
  }
});

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
router.post('/', [verifyToken, verifyAdmin, upload.single('file')], async (req, res) => {
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

// UPDATE A TASK
// This route is protected
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // Task ID
    const { title, description, status, due_date, assignee_id, requestMessage, request_message } = req.body;

    // Use requestMessage from frontend, fallback to request_message if present
    const reqMsg = requestMessage || request_message || null;

    // Build dynamic update query
    let updateFields = ['title', 'description', 'status', 'due_date', 'assignee_id'];
    let updateValues = [title, description, status, due_date, assignee_id];
    let setClauseArr = [];
    for (let i = 0; i < updateFields.length; i++) {
      setClauseArr.push(updateFields[i] + ' = $' + (i + 1));
    }
    let paramIndex = updateFields.length + 1;
    if (reqMsg !== null && reqMsg !== undefined) {
      setClauseArr.push('request_message = $' + paramIndex);
      updateValues.push(reqMsg);
      paramIndex++;
    }
    let setClause = setClauseArr.join(', ');

    let query = '';
    let params = updateValues.slice();
    if (req.user.role === 'ADMIN') {
      query = 'UPDATE tasks SET ' + setClause + ' WHERE task_id = $' + paramIndex + ' RETURNING *';
      params.push(id);
    } else {
      query = 'UPDATE tasks SET ' + setClause + ' WHERE task_id = $' + paramIndex + ' AND assignee_id = $' + (paramIndex + 1) + ' RETURNING *';
      params.push(id, req.user.id);
    }

    // Debug logging
    console.log('--- UPDATE TASK DEBUG ---');
    console.log('due_date:', due_date);
    console.log('params:', params);
    console.log('query:', query);

    const updatedTask = await db.query(query, params);

    if (updatedTask.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Task not found or user not authorized.' });
    }

    res.json(updatedTask.rows[0]);
  } catch (err) {
    console.error('Update Task Error:', err.message);
    res.status(500).send('Server Error');
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