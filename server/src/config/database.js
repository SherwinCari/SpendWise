require('dotenv').config();

const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
});

/**
 * Execute a single query against the connection pool.
 * @param {string} text - SQL query string with $1, $2... placeholders
 * @param {Array} params - Parameter values for the query
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Acquire a client from the pool for transaction usage.
 * Caller is responsible for calling client.release() when done.
 *
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     // ... transactional queries ...
 *     await client.query('COMMIT');
 *   } catch (err) {
 *     await client.query('ROLLBACK');
 *     throw err;
 *   } finally {
 *     client.release();
 *   }
 *
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
