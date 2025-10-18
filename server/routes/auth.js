// server/routes/auth.js

const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// === REGISTRATION ROUTE ===
router.post('/register', async (req, res) => {
  try {
    // 1. Destructure the req.body (get username, email, password)
    const { username, email, password } = req.body;

    // 2. Check if user already exists
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length > 0) {
      // 409 Conflict
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // 3. Bcrypt the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert the new user into the database
    // We are setting 'USER' as the default role
    const newUser = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role',
      [username, email, passwordHash, 'USER']
    );

    // 5. Generate the JWT token
    const userPayload = {
      user: {
        id: newUser.rows[0].user_id,
        role: newUser.rows[0].role,
      },
    };

    const token = jwt.sign(userPayload, process.env.JWT_SECRET, {
      expiresIn: '1h', // Token will last for 1 hour
    });

    // 6. Send the token back to the client
    res.json({ token });
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// === LOGIN ROUTE ===
router.post('/login', async (req, res) => {
  try {
    // 1. Destructure the req.body
    const { email, password } = req.body;

    // 2. Check if user exists
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      // 401 Unauthorized
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 3. Compare the provided password with the database password
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password_hash
    );

    if (!validPassword) {
      // 401 Unauthorized
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 4. Generate the JWT token (same as registration)
    const userPayload = {
      user: {
        id: user.rows[0].user_id,
        role: user.rows[0].role,
      },
    };

    const token = jwt.sign(userPayload, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // 5. Send the token and user info (excluding password)
    res.json({
      token,
      user: {
        id: user.rows[0].user_id,
        username: user.rows[0].username,
        email: user.rows[0].email,
        role: user.rows[0].role,
      },
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;