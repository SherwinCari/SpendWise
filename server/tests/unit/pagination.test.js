'use strict';

const { parsePagination, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../../src/utils/pagination');

describe('parsePagination', () => {
  test('returns defaults when no query params provided', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  test('returns defaults when query is undefined', () => {
    const result = parsePagination();
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  test('parses valid page and limit from query', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  test('computes correct offset for page 1', () => {
    const result = parsePagination({ page: '1', limit: '20' });
    expect(result.offset).toBe(0);
  });

  test('computes correct offset for page 5 with limit 10', () => {
    const result = parsePagination({ page: '5', limit: '10' });
    expect(result.offset).toBe(40);
  });

  test('defaults page when page is less than 1', () => {
    const result = parsePagination({ page: '0', limit: '10' });
    expect(result.page).toBe(DEFAULT_PAGE);
  });

  test('defaults page when page is negative', () => {
    const result = parsePagination({ page: '-5', limit: '10' });
    expect(result.page).toBe(DEFAULT_PAGE);
  });

  test('defaults page when page is not a number', () => {
    const result = parsePagination({ page: 'abc', limit: '10' });
    expect(result.page).toBe(DEFAULT_PAGE);
  });

  test('defaults limit when limit is less than 1', () => {
    const result = parsePagination({ page: '1', limit: '0' });
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  test('defaults limit when limit is negative', () => {
    const result = parsePagination({ page: '1', limit: '-10' });
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  test('defaults limit when limit is not a number', () => {
    const result = parsePagination({ page: '1', limit: 'xyz' });
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  test('caps limit at MAX_LIMIT when limit exceeds maximum', () => {
    const result = parsePagination({ page: '1', limit: '200' });
    expect(result.limit).toBe(MAX_LIMIT);
    expect(result.offset).toBe(0);
  });

  test('allows limit at exactly MAX_LIMIT', () => {
    const result = parsePagination({ page: '1', limit: '100' });
    expect(result.limit).toBe(100);
  });

  test('handles floating point page gracefully', () => {
    const result = parsePagination({ page: '2.7', limit: '10' });
    expect(result.page).toBe(2);
    expect(result.offset).toBe(10);
  });

  test('handles floating point limit gracefully', () => {
    const result = parsePagination({ page: '1', limit: '15.9' });
    expect(result.limit).toBe(15);
    expect(result.offset).toBe(0);
  });
});
