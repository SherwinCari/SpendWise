'use strict';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from query string.
 * Applies defaults and constraints, then computes the offset.
 *
 * @param {object} query - The req.query object
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Apply defaults for invalid or missing values
  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  // Enforce max limit
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

module.exports = { parsePagination, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT };
