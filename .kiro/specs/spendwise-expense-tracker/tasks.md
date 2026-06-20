# Implementation Plan: spendwise-expense-tracker

## Overview

This implementation plan covers the full-stack SpendWise expense tracker as a monorepo with separate `server/` and `client/` directories. The server is a Node.js/Express REST API (CommonJS) with PostgreSQL (Neon), JWT authentication, and layered architecture. The client is a React Native/Expo mobile application with React Navigation, dark mode theming, and a complete set of financial management screens. Tasks are ordered to build foundational infrastructure first, then domain logic, then UI, and finally integration between client and server.

## Tasks

- [x] 1. Monorepo setup, environment configuration, and dependencies
  - [x] 1.1 Initialize monorepo folder structure and root configuration
    - Create root `package.json` with workspaces configuration for `server/` and `client/`
    - Create root `.gitignore` covering node_modules, .env, .expo, build artifacts
    - Create root `README.md` with project overview and setup instructions
    - _Requirements: 16.1, 17.1_

  - [x] 1.2 Set up server directory with dependencies and configuration
    - Initialize `server/package.json` with CommonJS (`"type": "commonjs"`)
    - Install production dependencies with versions:
      - `express@^4.18.2` — HTTP framework
      - `pg@^8.11.3` — PostgreSQL client
      - `@neondatabase/serverless@^0.9.0` — Neon serverless driver
      - `bcrypt@^5.1.1` — Password hashing
      - `jsonwebtoken@^9.0.2` — JWT creation/verification
      - `joi@^17.11.0` — Request validation schemas
      - `uuid@^9.0.0` — UUID generation
      - `cors@^2.8.5` — CORS middleware
      - `dotenv@^16.3.1` — Environment variable loading
      - `helmet@^7.1.0` — Security headers
    - Install dev dependencies:
      - `jest@^29.7.0` — Test runner
      - `fast-check@^3.15.0` — Property-based testing
      - `supertest@^6.3.3` — HTTP integration testing
      - `nodemon@^3.0.2` — Dev server auto-restart
    - Add npm scripts: `start`, `dev`, `test`, `test:unit`, `test:property`, `test:integration`
    - _Requirements: 16.1, 16.4_

  - [x] 1.3 Set up client directory with Expo and dependencies
    - Initialize Expo project in `client/` using `npx create-expo-app` (blank template)
    - Install production dependencies:
      - `@react-navigation/native@^6.1.9` — Navigation container
      - `@react-navigation/stack@^6.3.20` — Stack navigator (auth flow)
      - `@react-navigation/bottom-tabs@^6.5.11` — Bottom tab navigator
      - `react-native-screens@^3.29.0` — Native screen optimization
      - `react-native-safe-area-context@^4.8.2` — Safe area handling
      - `@react-native-async-storage/async-storage@^1.21.0` — Local storage
      - `expo-secure-store@^12.8.1` — Secure token storage
      - `axios@^1.6.5` — HTTP client
      - `react-native-chart-kit@^6.12.0` — Charts and graphs
      - `react-native-svg@^14.1.0` — SVG rendering for charts
      - `expo-font@^11.10.2` — Custom font loading (Inter)
      - `expo-splash-screen@^0.26.4` — Splash screen management
      - `react-native-paper@^5.12.3` — Material Design components
      - `react-native-vector-icons@^10.0.3` — Icon library
    - Install dev dependencies:
      - `jest@^29.7.0` — Test runner
      - `@testing-library/react-native@^12.4.3` — Component testing
    - _Requirements: 16.1_

  - [x] 1.4 Create environment configuration files
    - Create `server/.env.example` template:
      ```
      DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
      JWT_ACCESS_SECRET=your-access-secret
      JWT_REFRESH_SECRET=your-refresh-secret
      JWT_ACCESS_EXPIRY=15m
      JWT_REFRESH_EXPIRY=7d
      BCRYPT_ROUNDS=10
      PORT=3000
      NODE_ENV=development
      ```
    - Create `client/.env.example` template:
      ```
      API_BASE_URL=http://localhost:3000/api
      ```
    - Create `server/.env` from template with development defaults
    - Create `client/.env` from template with local dev URL
    - _Requirements: 17.1, 17.2_

- [x] 2. Server — Database setup and migration
  - [x] 2.1 Configure PostgreSQL connection with Neon serverless driver
    - Create `server/src/config/database.js` with connection pool using `@neondatabase/serverless`
    - Configure SSL, pool size, and idle timeout from environment variables
    - Export `query()` and `getClient()` helper functions for transactions
    - _Requirements: 16.1, 16.4_

  - [x] 2.2 Create database migration script
    - Create `server/MIGRATION/001_initial_schema.sql` with all tables:
      - `users` (id UUID PK, name, email UNIQUE, password_hash, created_at)
      - `wallets` (id UUID PK, user_id FK, name, balance NUMERIC(12,2), created_at)
      - `categories` (id UUID PK, user_id FK, name, type, icon, color, created_at, UNIQUE(user_id, name, type))
      - `transactions` (id UUID PK, user_id FK, wallet_id FK, category_id FK, type, amount NUMERIC(12,2), description, date, created_at, updated_at)
      - `budgets` (id UUID PK, user_id FK, category_id FK, amount_limit NUMERIC(12,2), period, start_date, end_date, created_at)
      - `budget_tracking` (id UUID PK, user_id FK, budget_id FK, spent NUMERIC(12,2) DEFAULT 0, updated_at)
      - `notifications` (id UUID PK, user_id FK, title, message, type, is_read BOOLEAN DEFAULT false, created_at)
      - `sessions` (id UUID PK, user_id FK, refresh_token, expires_at, created_at)
      - `recurring_transactions` (id UUID PK, user_id FK, wallet_id FK, category_id FK, title, amount NUMERIC(12,2), interval, next_due_date, type, created_at)
    - Enable `pgcrypto` extension for UUID generation
    - Add indexes on user_id foreign keys and date columns
    - _Requirements: 1.1, 3.1, 4.1, 8.1, 10.1_

- [x] 3. Server — Core infrastructure and middleware
  - [x] 3.1 Create JWT configuration and utility module
    - Create `server/src/config/jwt.js` with token secrets, expiry settings from env
    - Implement `generateAccessToken(userId)`, `generateRefreshToken(userId)`, `verifyToken(token, secret)` functions
    - Access token expiry: 15 minutes; Refresh token expiry: 7 days
    - _Requirements: 2.3, 2.4, 17.4_

  - [x] 3.2 Create authentication middleware
    - Create `server/src/middleware/auth.js` — extracts JWT from `Authorization: Bearer <token>`, verifies signature/expiry, attaches `req.userId`
    - Return 401 with `AUTHENTICATION_ERROR` for invalid/expired tokens
    - _Requirements: 2.6, 17.4_

  - [x] 3.3 Create validation middleware and Joi schemas
    - Create `server/src/middleware/validate.js` — factory that validates `req.body` against Joi schema
    - Create `server/src/validators/auth.validator.js` — register (name, email, password≥8), login (email, password)
    - Create `server/src/validators/transaction.validator.js` — create/update (amount>0, type enum, category_id, wallet_id, date)
    - Create `server/src/validators/wallet.validator.js` — create (name, balance≥0), transfer (source, destination, amount>0)
    - Create `server/src/validators/budget.validator.js` — create (category_id, amount_limit>0, period enum, start_date)
    - Create `server/src/validators/category.validator.js` — create (name, type enum), update (name, icon, color)
    - Return 400 with `VALIDATION_ERROR` and field-level details on failure
    - _Requirements: 1.3, 1.4, 3.6, 4.4, 4.5, 8.6, 11.3_

  - [x] 3.4 Create custom error classes and global error handler
    - Create `server/src/utils/errors.js` with `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `DuplicateError`, `ConflictError`, `NotFoundError`, `InsufficientFundsError`
    - Create `server/src/middleware/errorHandler.js` — maps errors to consistent JSON format `{ success: false, error: { code, message, details } }`
    - _Requirements: 2.2, 5.3, 6.3, 10.4, 11.2_

  - [x] 3.5 Create Express app entry point and server configuration
    - Create `server/index.js` — Express app setup with helmet, cors, JSON parser, routes, error handler
    - Wire up all route modules under `/api` prefix
    - Configure `dotenv` loading and port listening
    - _Requirements: 16.1, 17.1_

  - [x] 3.6 Create utility modules (pagination, serializer)
    - Create `server/src/utils/pagination.js` — parse page/limit from query params, apply defaults (page=1, limit=20), generate offset
    - Create `server/src/utils/serializer.js` — `serialize(transaction)` and `deserialize(jsonString)` with validation and error reporting
    - _Requirements: 16.3, 18.1, 18.2, 18.3, 18.4_

- [x] 4. Server — Repository layer (data access)
  - [x] 4.1 Implement user repository
    - Create `server/src/repositories/user.repository.js`
    - Methods: `create(name, email, passwordHash)`, `findByEmail(email)`, `findById(id)`
    - Use parameterized queries for SQL injection prevention
    - _Requirements: 1.1, 1.2, 2.1_

  - [x] 4.2 Implement wallet repository
    - Create `server/src/repositories/wallet.repository.js`
    - Methods: `create(userId, name, balance)`, `findByUserId(userId)`, `findById(id)`, `updateName(id, name)`, `updateBalance(id, newBalance)`, `delete(id)`, `hasTransactions(id)`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 4.3 Implement category repository
    - Create `server/src/repositories/category.repository.js`
    - Methods: `create(userId, name, type, icon, color)`, `findByUserId(userId)`, `findById(id)`, `update(id, fields)`, `delete(id)`, `findDuplicate(userId, name, type)`, `reassignTransactions(categoryId, defaultCategoryId)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.4 Implement transaction repository
    - Create `server/src/repositories/transaction.repository.js`
    - Methods: `create(fields)`, `findById(id)`, `findByUserId(userId, filters, pagination)`, `update(id, fields)`, `delete(id)`
    - Support filters: date range, category_id, type, search (ILIKE on description)
    - Order by date DESC, apply LIMIT/OFFSET pagination
    - _Requirements: 4.1, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.5 Implement budget and budget_tracking repositories
    - Create `server/src/repositories/budget.repository.js`
    - Methods: `create(fields)`, `findByUserId(userId)`, `findById(id)`, `update(id, amountLimit)`, `delete(id)`, `findDuplicate(userId, categoryId, period)`, `findByCategoryAndPeriod(userId, categoryId)`
    - Create budget_tracking methods: `createTracking(budgetId, userId)`, `updateSpent(budgetId, amount, operation)`, `getTracking(budgetId)`, `deleteTracking(budgetId)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.6 Implement notification repository
    - Create `server/src/repositories/notification.repository.js`
    - Methods: `create(userId, title, message, type)`, `findByUserId(userId)`, `markAsRead(id)`, `findExistingThreshold(userId, budgetId, type)`
    - Order by created_at DESC
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

- [x] 5. Server — Service layer (business logic)
  - [x] 5.1 Implement auth service
    - Create `server/src/services/auth.service.js`
    - `register(name, email, password)` — hash password (bcrypt, rounds≥10), create user, create session, return tokens+user
    - `login(email, password)` — verify credentials, create session, return tokens+user
    - `refreshToken(refreshToken)` — validate session, issue new tokens, rotate refresh token
    - `logout(refreshToken)` — delete session record
    - _Requirements: 1.1, 1.5, 1.6, 2.1, 2.2, 2.7, 2.8, 2.9, 17.2_

  - [x] 5.2 Implement wallet service
    - Create `server/src/services/wallet.service.js`
    - `create(userId, { name, balance })` — create wallet with initial balance
    - `list(userId)` — return all wallets for user
    - `update(userId, walletId, { name })` — update wallet name with ownership check
    - `delete(userId, walletId)` — reject if has transactions or non-zero balance
    - `transfer(userId, { sourceWalletId, destinationWalletId, amount })` — validate same-wallet, insufficient funds, amount>0; execute atomic transfer in DB transaction
    - `adjustBalance(walletId, amount, type)` — internal: +income / -expense with non-negative check
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 5.3 Implement category service
    - Create `server/src/services/category.service.js`
    - `create(userId, { name, type, icon, color })` — check duplicate (name+type per user), create
    - `list(userId)` — return categories grouped by type
    - `update(userId, categoryId, { name, icon, color })` — ownership check, save changes
    - `delete(userId, categoryId)` — reassign transactions to "Uncategorized", then delete
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.4 Implement transaction service
    - Create `server/src/services/transaction.service.js`
    - `create(userId, fields)` — create transaction, adjust wallet balance, update budget tracking (if expense); all in DB transaction
    - `getById(userId, transactionId)` — ownership check
    - `list(userId, filters)` — delegate to repository with pagination
    - `update(userId, transactionId, updates)` — ownership check, recalculate wallet balance difference, recalculate budget tracking if category changed
    - `delete(userId, transactionId)` — ownership check, reverse wallet balance, reverse budget tracking
    - `serialize(transaction)` / `deserialize(jsonString)` — round-trip JSON with validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.6, 18.1, 18.2, 18.3, 18.4_

  - [x] 5.5 Implement budget service
    - Create `server/src/services/budget.service.js`
    - `create(userId, { categoryId, amountLimit, period, startDate })` — check duplicate (category+period), create budget + budget_tracking (spent=0)
    - `list(userId)` — return budgets with progress (spent, limit, percentage, remaining)
    - `update(userId, budgetId, { amountLimit })` — ownership check, save new limit
    - `delete(userId, budgetId)` — delete budget + budget_tracking
    - `updateSpent(userId, categoryId, amount, operation)` — add/subtract from budget_tracking spent
    - `recalculateSpent(userId, categoryId)` — recalculate from all transactions in period
    - `getProgress(budgetId)` — compute percentage = (spent/limit) × 100
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.6 Implement notification service
    - Create `server/src/services/notification.service.js`
    - `create(userId, { title, message, type })` — create notification record
    - `list(userId)` — return all notifications sorted by created_at DESC
    - `markAsRead(userId, notificationId)` — ownership check, set is_read=true
    - `checkBudgetThresholds(userId, budgetId)` — check 50%, 75%, 100% thresholds; create notification only if not already sent for that threshold+budget+period (idempotent)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 5.7 Implement analytics engine
    - Create `server/src/services/analytics.service.js`
    - `getMonthlySummary(userId, year, month)` — aggregate income/expense/net for the month
    - `getCategoryBreakdown(userId, startDate, endDate)` — sum by category for period
    - `getSpendingTrends(userId)` — monthly expense totals for last 6 months
    - Return zero values for periods with no transactions
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Server — Route layer (API endpoints)
  - [x] 6.1 Implement auth routes
    - Create `server/src/routes/auth.routes.js`
    - POST `/api/auth/register` — validate body, call auth.service.register
    - POST `/api/auth/login` — validate body, call auth.service.login
    - POST `/api/auth/refresh` — call auth.service.refreshToken
    - POST `/api/auth/logout` — authenticate, call auth.service.logout
    - _Requirements: 1.1, 2.1, 2.7, 2.9_

  - [x] 6.2 Implement category routes
    - Create `server/src/routes/category.routes.js`
    - POST `/api/categories` — authenticate, validate, create
    - GET `/api/categories` — authenticate, list
    - PUT `/api/categories/:id` — authenticate, validate, update
    - DELETE `/api/categories/:id` — authenticate, delete
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [x] 6.3 Implement transaction routes
    - Create `server/src/routes/transaction.routes.js`
    - POST `/api/transactions` — authenticate, validate, create
    - GET `/api/transactions` — authenticate, list with query params (page, limit, startDate, endDate, categoryId, type, search)
    - GET `/api/transactions/:id` — authenticate, getById
    - PUT `/api/transactions/:id` — authenticate, validate, update
    - DELETE `/api/transactions/:id` — authenticate, delete
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.4 Implement wallet routes
    - Create `server/src/routes/wallet.routes.js`
    - POST `/api/wallets` — authenticate, validate, create
    - GET `/api/wallets` — authenticate, list
    - PUT `/api/wallets/:id` — authenticate, validate, update
    - DELETE `/api/wallets/:id` — authenticate, delete
    - POST `/api/wallets/transfer` — authenticate, validate, transfer
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1_

  - [x] 6.5 Implement budget routes
    - Create `server/src/routes/budget.routes.js`
    - POST `/api/budgets` — authenticate, validate, create
    - GET `/api/budgets` — authenticate, list with progress
    - PUT `/api/budgets/:id` — authenticate, validate, update
    - DELETE `/api/budgets/:id` — authenticate, delete
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 6.6 Implement notification routes
    - Create `server/src/routes/notification.routes.js`
    - GET `/api/notifications` — authenticate, list
    - PUT `/api/notifications/:id/read` — authenticate, markAsRead
    - _Requirements: 9.5, 9.6_

  - [x] 6.7 Implement analytics routes
    - Create `server/src/routes/analytics.routes.js`
    - GET `/api/analytics/monthly-summary` — authenticate, query params (year, month)
    - GET `/api/analytics/category-breakdown` — authenticate, query params (startDate, endDate)
    - GET `/api/analytics/trends` — authenticate, getSpendingTrends
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 7. Checkpoint — Server API complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Server — Property-based tests
  - [x] 8.1 Write property test for transaction serialization round-trip
    - **Property 1: Transaction Serialization Round-Trip**
    - Create `server/tests/property/serialization.property.test.js`
    - Use fast-check transactionArb generator; verify serialize→deserialize produces equivalent object
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 18.1, 18.2, 18.3**

  - [x] 8.2 Write property test for malformed JSON parse errors
    - **Property 2: Malformed JSON Returns Descriptive Parse Error**
    - Add test to `server/tests/property/serialization.property.test.js`
    - Generate arbitrary invalid JSON strings; verify descriptive error returned without unhandled exception
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 18.4**

  - [x] 8.3 Write property test for wallet balance adjustment invariant
    - **Property 3: Wallet Balance Adjustment Invariant**
    - Create `server/tests/property/wallet-balance.property.test.js`
    - Generate transaction amount+type; verify balance adjusted by exact amount, reversible on delete
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 4.2, 4.3, 5.2, 6.1, 6.2**

  - [x] 8.4 Write property test for wallet transfer conservation
    - **Property 4: Wallet Transfer Conservation**
    - Add test to `server/tests/property/wallet-balance.property.test.js`
    - Generate transfer amount between two wallets; verify total sum unchanged
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 11.1**

  - [x] 8.5 Write property test for budget tracking adjustment invariant
    - **Property 5: Budget Tracking Adjustment Invariant**
    - Create `server/tests/property/budget-tracking.property.test.js`
    - Generate expense transactions; verify budget_tracking spent increases/decreases correctly on create/delete/category-change
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 4.6, 5.4, 6.4**

  - [x] 8.6 Write property test for budget progress calculation
    - **Property 6: Budget Progress Calculation**
    - Add test to `server/tests/property/budget-tracking.property.test.js`
    - Generate limit L and spent S (L>0); verify percentage equals (S/L)×100
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 8.5**

  - [x] 8.7 Write property test for budget threshold notifications
    - **Property 7: Budget Threshold Notifications**
    - Add test to `server/tests/property/budget-tracking.property.test.js`
    - Generate sequences of expenses crossing 50%, 75%, 100%; verify correct notification types created
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 8.8 Write property test for threshold notification idempotence
    - **Property 8: Threshold Notification Idempotence**
    - Add test to `server/tests/property/budget-tracking.property.test.js`
    - Call checkBudgetThresholds multiple times for same state; verify at most one notification per threshold
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 9.4**

  - [-] 8.9 Write property test for user data isolation
    - **Property 9: User Data Isolation**
    - Create `server/tests/property/authorization.property.test.js`
    - Generate two user IDs; verify user A cannot read/update/delete user B's resources
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 5.3, 6.3, 7.6, 13.4**

  - [-] 8.10 Write property test for transaction filter correctness
    - **Property 10: Transaction Filter Correctness**
    - Create `server/tests/property/transaction-query.property.test.js`
    - Generate filter criteria and transaction sets; verify all results satisfy ALL filters and no valid result excluded
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

  - [-] 8.11 Write property test for transaction list ordering
    - **Property 11: Transaction List Ordering**
    - Add test to `server/tests/property/transaction-query.property.test.js`
    - Generate transaction list; verify strictly descending date order within and across pages
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 7.1**

  - [-] 8.12 Write property test for invalid transfer rejection
    - **Property 12: Invalid Transfer Rejection**
    - Create `server/tests/property/validation.property.test.js`
    - Generate transfers exceeding balance, amount≤0, same source/destination; verify rejection without balance modification
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [-] 8.13 Write property test for password hashing
    - **Property 13: Password Hashing**
    - Create `server/tests/property/auth.property.test.js`
    - Generate arbitrary passwords; verify stored hash ≠ plaintext and bcrypt rounds ≥ 10
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 1.5, 17.2**

  - [x] 8.14 Write property test for enum field validation
    - **Property 14: Enum Field Validation**
    - Add test to `server/tests/property/validation.property.test.js`
    - Generate arbitrary strings not in enum sets; verify rejection with validation error
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 3.6, 8.6**

  - [x] 8.15 Write property test for wallet non-negative balance constraint
    - **Property 15: Wallet Non-Negative Balance Constraint**
    - Add test to `server/tests/property/wallet-balance.property.test.js`
    - Generate expense amounts exceeding wallet balance; verify rejection without balance modification
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 10.5, 11.2**

  - [x] 8.16 Write property test for analytics aggregation correctness
    - **Property 16: Analytics Aggregation Correctness**
    - Create `server/tests/property/analytics.property.test.js`
    - Generate transaction sets for a period; verify total_income = sum(income), total_expenses = sum(expense), net = income - expenses
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 13.1, 13.2**

  - [x] 8.17 Write property test for duplicate detection
    - **Property 17: Duplicate Detection**
    - Add test to `server/tests/property/validation.property.test.js`
    - Generate duplicate creation attempts (email, category name+type, budget category+period); verify rejection without data modification
    - Config: `{ numRuns: 100 }`
    - **Validates: Requirements 1.2, 3.2, 8.2**

- [x] 9. Server — Unit and integration tests
  - [x] 9.1 Write unit tests for auth service
    - Create `server/tests/unit/auth.service.test.js`
    - Test: token expiry timing (15min access, 7d refresh), session creation on register, logout invalidation, generic error message on bad credentials
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.9_

  - [x] 9.2 Write unit tests for transaction service
    - Create `server/tests/unit/transaction.service.test.js`
    - Test: updated_at set on creation, field validation messages, ownership check rejection
    - _Requirements: 4.5, 4.7, 5.3, 6.3_

  - [x] 9.3 Write unit tests for wallet and budget services
    - Create `server/tests/unit/wallet.service.test.js` and `server/tests/unit/budget.service.test.js`
    - Wallet: deletion rejection (has transactions vs non-zero balance), transfer edge cases
    - Budget: progress at boundary values (0%, 50%, 75%, 100%), deletion cascading tracking
    - _Requirements: 10.4, 10.5, 8.3, 8.4, 8.5_

  - [x] 9.4 Write integration tests for full API flows
    - Create `server/tests/integration/auth.integration.test.js` — Register→Login→Refresh→Logout
    - Create `server/tests/integration/transaction.integration.test.js` — CRUD + wallet balance verification
    - Create `server/tests/integration/budget.integration.test.js` — Create budget→Add expenses→Verify notifications at thresholds
    - Create `server/tests/integration/wallet.integration.test.js` — Transfer→Verify linked transactions
    - Use supertest against Express app
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 8.1, 9.1, 10.1, 11.1_

- [x] 10. Checkpoint — Server fully tested
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Client — Theme, constants, and reusable UI components
  - [x] 11.1 Create theme configuration with dark mode support
    - Create `client/src/theme/colors.js` with light and dark palettes:
      - Light: primary `#0D9488`, accent `#F59E0B`, background `#F8FAFC`, card `#FFFFFF`, income `#10B981`, expense `#EF4444`, textPrimary `#1E293B`, textSecondary `#64748B`
      - Dark: primary `#0D9488`, accent `#F59E0B`, background `#0F172A`, card `#1E293B`, income `#10B981`, expense `#EF4444`, textPrimary `#F1F5F9`, textSecondary `#94A3B8`
    - Create `client/src/theme/typography.js` with Inter/SF Pro font scale (12/14/16/20/24/32px), weights (400/500/600/700)
    - Create `client/src/theme/spacing.js` with 4px base unit scale (4/8/12/16/24/32)
    - Create `client/src/theme/shapes.js` with borderRadius (12px cards, 8px buttons) and shadow definitions
    - Create `client/src/theme/ThemeContext.js` with React Context for dark/light mode toggle and persistence via AsyncStorage
    - _Requirements: 16.1_

  - [x] 11.2 Create reusable UI components
    - Create `client/src/components/common/Button.js` — Primary, secondary, danger variants; 8px border radius, teal shadow
    - Create `client/src/components/common/Card.js` — 12px border radius, soft teal shadow, dark mode support
    - Create `client/src/components/common/Input.js` — Text input with label, error state, 8px border radius
    - Create `client/src/components/common/Modal.js` — Confirmation/action modal with backdrop
    - Create `client/src/components/common/LoadingSpinner.js` — Activity indicator with theme colors
    - Create `client/src/components/common/EmptyState.js` — Illustration + message for empty lists
    - Create `client/src/components/common/AmountText.js` — Formatted currency display, green for income, red for expense
    - Create `client/src/components/common/Avatar.js` — User avatar with initials fallback
    - _Requirements: 16.1_

  - [x] 11.3 Create transaction-specific UI components
    - Create `client/src/components/transactions/TransactionCard.js` — Shows amount (colored), category icon, description, date, wallet name
    - Create `client/src/components/transactions/TransactionForm.js` — Form for add/edit with type toggle, amount input, category picker, wallet picker, date picker, description
    - Create `client/src/components/transactions/FilterBar.js` — Horizontal filter chips for date range, category, type, search
    - _Requirements: 4.1, 5.1, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.4 Create wallet and budget UI components
    - Create `client/src/components/wallets/WalletCard.js` — Shows wallet name, balance (formatted), accent color indicator
    - Create `client/src/components/wallets/TransferForm.js` — Source/destination wallet pickers, amount input
    - Create `client/src/components/budgets/BudgetCard.js` — Category name, progress bar (colored: teal→gold→red), spent/limit amounts, percentage
    - Create `client/src/components/budgets/BudgetForm.js` — Category picker, amount input, period toggle (weekly/monthly), start date
    - _Requirements: 8.1, 8.5, 10.1, 10.2, 11.1_

- [x] 12. Client — State management and API client layer
  - [x] 12.1 Create API client with Axios and token refresh interceptor
    - Create `client/src/api/client.js` — Axios instance with `API_BASE_URL` from env
    - Add request interceptor: attach `Authorization: Bearer <accessToken>` from expo-secure-store
    - Add response interceptor: on 401, attempt token refresh via `/api/auth/refresh`, retry original request; on refresh failure, redirect to login
    - _Requirements: 2.3, 2.6, 2.7, 2.8_

  - [x] 12.2 Create API service modules
    - Create `client/src/api/authApi.js` — `register(name, email, password)`, `login(email, password)`, `refresh(refreshToken)`, `logout(refreshToken)`
    - Create `client/src/api/transactionsApi.js` — `create(data)`, `list(filters)`, `getById(id)`, `update(id, data)`, `delete(id)`
    - Create `client/src/api/walletsApi.js` — `create(data)`, `list()`, `update(id, data)`, `delete(id)`, `transfer(data)`
    - Create `client/src/api/budgetsApi.js` — `create(data)`, `list()`, `update(id, data)`, `delete(id)`
    - Create `client/src/api/categoriesApi.js` — `create(data)`, `list()`, `update(id, data)`, `delete(id)`
    - Create `client/src/api/notificationsApi.js` — `list()`, `markAsRead(id)`
    - Create `client/src/api/analyticsApi.js` — `getMonthlySummary(year, month)`, `getCategoryBreakdown(startDate, endDate)`, `getSpendingTrends()`
    - _Requirements: 1.1, 2.1, 4.1, 7.1, 8.1, 9.5, 10.1, 11.1, 13.1_

  - [x] 12.3 Create state management with React Context
    - Create `client/src/context/AuthContext.js` — user state, tokens (stored in expo-secure-store), login/logout/register actions, isAuthenticated flag
    - Create `client/src/context/WalletContext.js` — wallets list, selected wallet, CRUD actions, transfer action
    - Create `client/src/context/TransactionContext.js` — transactions list (paginated), filters, CRUD actions
    - Create `client/src/context/BudgetContext.js` — budgets list with progress, CRUD actions
    - Create `client/src/context/CategoryContext.js` — categories grouped by type, CRUD actions
    - Create `client/src/context/NotificationContext.js` — notifications list, unread count, markAsRead action
    - Create `client/src/context/AppProvider.js` — composes all providers together
    - _Requirements: 1.1, 2.1, 4.1, 8.1, 9.5, 10.1_

- [x] 13. Client — Navigation setup
  - [x] 13.1 Configure React Navigation with auth flow
    - Create `client/src/navigation/AuthStack.js` — Stack navigator with Login and Register screens
    - Create `client/src/navigation/MainTabs.js` — Bottom tab navigator with tabs: Home, Transactions, Wallets, Budgets, More
    - Create `client/src/navigation/RootNavigator.js` — Conditional rendering: AuthStack when unauthenticated, MainTabs when authenticated
    - Create `client/src/navigation/TransactionStack.js` — Stack navigator: TransactionList → TransactionDetails → AddEditTransaction
    - Create `client/src/navigation/WalletStack.js` — Stack navigator: WalletList → WalletTransfer
    - Create `client/src/navigation/BudgetStack.js` — Stack navigator: BudgetList → AddEditBudget
    - Create `client/src/navigation/MoreStack.js` — Stack navigator: MoreMenu → Analytics → Notifications → Categories → Settings
    - Configure tab bar styling: teal active icon, gray inactive, white/dark background
    - _Requirements: 1.1, 2.1_

  - [x] 13.2 Update App.js entry point with providers and navigation
    - Update `client/App.js` to load Inter font via expo-font
    - Wrap app with ThemeContext, AppProvider (all contexts), NavigationContainer
    - Configure expo-splash-screen to hide after font loading
    - Apply theme-aware status bar and navigation theme
    - _Requirements: 16.1_

- [x] 14. Client — Authentication screens
  - [x] 14.1 Implement Login screen
    - Create `client/src/screens/auth/LoginScreen.js`
    - UI: App logo, email input, password input (secure entry), "Login" button (primary teal), "Register" link
    - Validation: email format, password not empty; show inline field errors
    - On success: store tokens in expo-secure-store, navigate to MainTabs
    - On error: display server error message (generic "Invalid credentials")
    - _Requirements: 2.1, 2.2_

  - [x] 14.2 Implement Register screen
    - Create `client/src/screens/auth/RegisterScreen.js`
    - UI: Name input, email input, password input, confirm password input, "Register" button, "Login" link
    - Validation: name not empty, valid email, password ≥8 chars, passwords match
    - On success: store tokens, navigate to MainTabs
    - On error: display field-level errors (duplicate email, validation failures)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 15. Client — Dashboard/Home screen
  - [x] 15.1 Implement Dashboard screen
    - Create `client/src/screens/home/DashboardScreen.js`
    - Top section: Total balance across all wallets (large teal text)
    - Income/Expense summary cards: monthly totals with green/red coloring
    - Quick action buttons: "Add Income" (green), "Add Expense" (red)
    - Recent transactions list: last 5 transactions with TransactionCard component
    - Budget alerts section: budgets approaching/exceeding limits (gold/red indicators)
    - Pull-to-refresh to reload data
    - _Requirements: 10.2, 13.1, 9.1, 9.2, 9.3_

- [x] 16. Client — Transaction screens
  - [x] 16.1 Implement Transaction List screen
    - Create `client/src/screens/transactions/TransactionListScreen.js`
    - Display paginated list of transactions using FlatList with infinite scroll
    - FilterBar component at top: date range, category, type, search
    - Each item renders TransactionCard; pull-to-refresh support
    - Empty state when no transactions match filters
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 16.3_

  - [x] 16.2 Implement Add/Edit Transaction screen
    - Create `client/src/screens/transactions/AddEditTransactionScreen.js`
    - TransactionForm component with all fields
    - Type toggle: Income (green highlight) / Expense (red highlight)
    - Category picker: scrollable list of user categories filtered by selected type
    - Wallet picker: dropdown of user wallets with balances shown
    - Date picker: date selector defaulting to today
    - Amount input: numeric keyboard, formatted display
    - Create mode vs Edit mode (pre-fill fields from existing transaction)
    - Validation before submit; loading state during API call
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

  - [x] 16.3 Implement Transaction Details screen
    - Create `client/src/screens/transactions/TransactionDetailScreen.js`
    - Display all transaction fields with formatted amounts and dates
    - Category with icon and color indicator
    - Wallet name
    - Edit button → navigate to AddEditTransaction in edit mode
    - Delete button → confirmation modal → delete with wallet balance reversal
    - _Requirements: 5.1, 6.1, 6.2_

- [x] 17. Client — Wallet screens
  - [x] 17.1 Implement Wallet List screen
    - Create `client/src/screens/wallets/WalletListScreen.js`
    - Display wallets as cards (WalletCard) showing name and balance
    - Total balance header summing all wallets
    - "Add Wallet" FAB button
    - Swipe/long-press actions: Edit name, Delete (with validation errors for non-empty wallets)
    - "Transfer" button navigating to transfer screen
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 17.2 Implement Wallet Transfer screen
    - Create `client/src/screens/wallets/WalletTransferScreen.js`
    - TransferForm: source wallet picker, destination wallet picker, amount input
    - Show source wallet balance for reference
    - Validation: amount > 0, source ≠ destination, amount ≤ source balance
    - On success: show confirmation, navigate back with refreshed balances
    - On error: display specific error (insufficient funds, invalid transfer)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 18. Client — Budget screens
  - [x] 18.1 Implement Budget List screen
    - Create `client/src/screens/budgets/BudgetListScreen.js`
    - Display budgets as BudgetCard components with progress bars
    - Progress bar colors: teal (0-50%), gold (50-75%), red (75-100%+)
    - Show spent/limit amounts and percentage
    - "Add Budget" button
    - Tap to edit, swipe/long-press to delete
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [x] 18.2 Implement Add/Edit Budget screen
    - Create `client/src/screens/budgets/AddEditBudgetScreen.js`
    - BudgetForm: category picker (expense categories only), amount limit input, period toggle (weekly/monthly), start date picker
    - Validation: category required, amount > 0, period required
    - Prevent duplicate budget creation (show error if category+period already has active budget)
    - Edit mode: pre-fill with existing values, only allow amount_limit update
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

- [x] 19. Client — Analytics/Reports screen
  - [x] 19.1 Implement Analytics screen with charts
    - Create `client/src/screens/analytics/AnalyticsScreen.js`
    - Monthly Summary section: income/expense/net balance cards with colored amounts
    - Category Breakdown: Pie chart (react-native-chart-kit) showing spending per category with category colors
    - Spending Trends: Line chart showing monthly expenses for last 6 months (teal line, grid background)
    - Period selector: month/year picker for summary, date range for breakdown
    - Empty state when no data available for selected period
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 20. Client — Notifications screen
  - [x] 20.1 Implement Notifications screen
    - Create `client/src/screens/notifications/NotificationsScreen.js`
    - List of notifications sorted by created_at DESC
    - Visual distinction: unread (bold, teal left border) vs read (normal)
    - Notification types styled differently: warning (gold icon), caution (orange icon), critical (red icon)
    - Tap to mark as read
    - Badge count on tab icon for unread notifications
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

- [x] 21. Client — Category management screen
  - [x] 21.1 Implement Category Management screen
    - Create `client/src/screens/categories/CategoryManagementScreen.js`
    - Two tabs/sections: Income categories, Expense categories
    - Each category shows: icon, name, color indicator
    - "Add Category" button per section
    - Add/Edit modal: name input, type (pre-selected based on section), icon picker, color picker
    - Delete with confirmation — warn about reassignment to "Uncategorized"
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 22. Client — Settings and dark mode
  - [x] 22.1 Implement Settings screen with dark mode toggle
    - Create `client/src/screens/settings/SettingsScreen.js`
    - Dark mode toggle switch (persisted in AsyncStorage via ThemeContext)
    - User profile section: display name, email (from auth context)
    - Logout button: clear tokens from expo-secure-store, reset contexts, navigate to AuthStack
    - App version info
    - _Requirements: 2.9, 17.4_

- [x] 23. Checkpoint — Client screens complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 24. Integration — Connect client to server API
  - [x] 24.1 Wire authentication flow end-to-end
    - Verify Login screen → server `/api/auth/login` → token storage → MainTabs navigation
    - Verify Register screen → server `/api/auth/register` → token storage → MainTabs navigation
    - Verify token refresh interceptor handles 401 → `/api/auth/refresh` → retry
    - Verify logout clears tokens and returns to AuthStack
    - _Requirements: 1.1, 2.1, 2.6, 2.7, 2.8, 2.9_

  - [x] 24.2 Wire transaction CRUD flow end-to-end
    - Verify AddEditTransaction → server `/api/transactions` POST → updates TransactionContext + WalletContext (balance change)
    - Verify TransactionList → server `/api/transactions` GET with pagination and filters
    - Verify Edit flow → server PUT → context update
    - Verify Delete flow → server DELETE → wallet balance reversal → context update
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.1_

  - [x] 24.3 Wire wallet, budget, and analytics flows end-to-end
    - Verify WalletList → server `/api/wallets` GET
    - Verify WalletTransfer → server `/api/wallets/transfer` POST → both wallet balances update
    - Verify BudgetList → server `/api/budgets` GET with progress data
    - Verify AddEditBudget → server POST/PUT
    - Verify Analytics → server `/api/analytics/*` endpoints → chart rendering
    - Verify Notifications → server `/api/notifications` GET → badge count
    - _Requirements: 8.1, 8.5, 9.5, 10.2, 11.1, 13.1, 13.2, 13.3_

  - [x] 24.4 Handle loading states, error states, and edge cases
    - Add loading spinners to all screens during API calls
    - Add error toast/alert for failed API requests with user-friendly messages
    - Handle network errors gracefully (show "No connection" state)
    - Handle empty states (no transactions, no wallets, no budgets)
    - Handle form submission double-tap prevention (disable button during submit)
    - _Requirements: 16.1, 16.2_

- [x] 25. Client — Component tests
  - [x] 25.1 Write component tests for auth screens
    - Create `client/__tests__/screens/LoginScreen.test.js`
    - Create `client/__tests__/screens/RegisterScreen.test.js`
    - Test: renders correctly, validation errors shown, successful submit calls API
    - Use @testing-library/react-native
    - _Requirements: 1.1, 2.1_

  - [x] 25.2 Write component tests for core UI components
    - Create `client/__tests__/components/Button.test.js`
    - Create `client/__tests__/components/Card.test.js`
    - Create `client/__tests__/components/TransactionCard.test.js`
    - Create `client/__tests__/components/BudgetCard.test.js`
    - Test: renders with correct theme colors, handles press events, displays data correctly
    - _Requirements: 16.1_

  - [x] 25.3 Write tests for API client and interceptors
    - Create `client/__tests__/api/client.test.js`
    - Test: attaches auth token to requests, handles 401 with token refresh, redirects to login on refresh failure
    - Mock axios and expo-secure-store
    - _Requirements: 2.6, 2.7, 2.8_

- [x] 26. Final checkpoint — Full stack integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 7, 10, 23, 26) ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Server uses CommonJS (`require`/`module.exports`) — do NOT use ES module syntax
- Client uses React Native/Expo with functional components and hooks
- All money amounts stored as `NUMERIC(12,2)` in DB, passed as strings in API to preserve precision
- Dark mode colors: background `#0F172A`, card `#1E293B`, text `#F1F5F9`
- Light mode colors: background `#F8FAFC`, card `#FFFFFF`, text `#1E293B`
- Primary color `#0D9488` (teal) used for navigation accents, primary buttons, and confirmations
- Accent color `#F59E0B` (gold) used for warnings and highlights
- Border radius: 12px for cards/modals, 8px for buttons/inputs
- Typography: Inter or SF Pro font family; load via expo-font
- The `server/.env` file must NOT be committed to git — only `.env.example` templates
- Token storage: use expo-secure-store (not AsyncStorage) for JWT tokens on client

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "3.1", "11.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "11.2", "11.3", "11.4"] },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "12.1"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3", "12.2", "12.3"] },
    { "id": 7, "tasks": ["5.4", "5.5", "5.6", "5.7", "13.1"] },
    { "id": 8, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "13.2"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8"] },
    { "id": 10, "tasks": ["8.9", "8.10", "8.11", "8.12", "8.13", "8.14", "8.15", "8.16", "8.17"] },
    { "id": 11, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 12, "tasks": ["14.1", "14.2", "15.1"] },
    { "id": 13, "tasks": ["16.1", "16.2", "16.3", "17.1", "17.2"] },
    { "id": 14, "tasks": ["18.1", "18.2", "19.1", "20.1"] },
    { "id": 15, "tasks": ["21.1", "22.1"] },
    { "id": 16, "tasks": ["24.1", "24.2", "24.3", "24.4"] },
    { "id": 17, "tasks": ["25.1", "25.2", "25.3"] }
  ]
}
```
