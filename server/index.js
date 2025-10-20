// server/index.js

// This MUST be the first line
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db'); // Our database module

// Create the express app
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());


app.use('/uploads', express.static('uploads'));
// --- Routes ---


// A simple test route
app.get('/', (req, res) => {
  res.send('Hello from the Task Manager API!');
});

// A route to test our database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      message: 'Database connection successful!',
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error('Error testing database connection:', err.stack);
    res.status(500).json({
      message: 'Database connection failed!',
      error: err.message,
    });
  }
});

// === NEW LINE 1: REGISTER THE AUTH ROUTES ===
app.use('/api/auth', require('./routes/auth'));
// -------------------------------------------

// --- NEW LINE 2: REGISTER THE TASK ROUTES ---
app.use('/api/tasks', require('./routes/tasks'));
// ------------------------------------------

app.use('/api/admin', require('./routes/admin'));
// --- Start the Server ---
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});