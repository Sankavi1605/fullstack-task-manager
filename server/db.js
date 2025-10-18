// server/db.js

// This MUST be the first line
require('dotenv').config();

const { Pool } = require('pg');

// Create a new pool instance, but this time we
// explicitly pass in the connection details.
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

// We export a query function that will be used by our routes
module.exports = {
  query: (text, params) => pool.query(text, params),
};