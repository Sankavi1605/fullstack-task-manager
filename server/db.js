// server/db.js

// This MUST be the first line
require('dotenv').config();

// 1. Import 'types' from 'pg'
const { Pool, types } = require('pg');

// --- START OF THE FIX ---
// 2. Get the OID for the DATE type
const DATE_OID = 1082;
// 3. Force node-pg to parse DATE types as plain strings (YYYY-MM-DD)
types.setTypeParser(DATE_OID, (val) => val);
// --- END OF THE FIX ---

// Create a new pool instance
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

// We export a query function
module.exports = {
  query: (text, params) => pool.query(text, params),
};