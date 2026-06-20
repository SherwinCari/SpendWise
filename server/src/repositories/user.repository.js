'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new user record.
 * @param {string} name - User's display name
 * @param {string} email - User's email address
 * @param {string} passwordHash - Bcrypt-hashed password
 * @returns {Promise<object>} The created user row (id, name, email, created_at)
 */
async function create(name, email, passwordHash) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, created_at`,
    [id, name, email, passwordHash]
  );
  return result.rows[0];
}

/**
 * Find a user by email address.
 * @param {string} email - Email to search for
 * @returns {Promise<object|null>} The user row or null if not found
 */
async function findByEmail(email) {
  const result = await query(
    `SELECT id, name, email, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Find a user by their unique ID.
 * @param {string} id - UUID of the user
 * @returns {Promise<object|null>} The user row or null if not found
 */
async function findById(id) {
  const result = await query(
    `SELECT id, name, email, password_hash, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { create, findByEmail, findById };
