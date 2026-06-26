'use strict';

// Load environment variables before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { errorHandler } = require('./src/middleware/errorHandler');

// Route modules
const authRoutes = require('./src/routes/auth.routes');
const categoryRoutes = require('./src/routes/category.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const budgetRoutes = require('./src/routes/budget.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const recurringRoutes = require('./src/routes/recurring.routes');
const savingsRoutes = require('./src/routes/savings.routes');
const remindersRoutes = require('./src/routes/reminders.routes');

// Create Express application
const app = express();

// --------------- Global Middleware ---------------

// Security headers
app.use(helmet());

// CORS — allow cross-origin requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// --------------- API Routes ---------------

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/reminders', remindersRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Error Handling ---------------

// Global error handler (must be registered AFTER routes)
app.use(errorHandler);

// --------------- Start Server ---------------

const PORT = parseInt(process.env.PORT, 10) || 3000;

// Only start listening when this file is run directly (not when imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SpendWise server listening on port ${PORT}`);
  });
}

// Export for testing with supertest
module.exports = app;
