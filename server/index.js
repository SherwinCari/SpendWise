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

// Homepage
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Quorax</title><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0F172A;color:#F1F5F9;text-align:center}
    .container{max-width:500px;padding:40px}.title{font-size:2.5rem;color:#0D9488;margin-bottom:8px}.subtitle{color:#94A3B8;font-size:1.1rem}
    a{color:#0D9488;text-decoration:none}</style></head>
    <body><div class="container">
    <h1 class="title">Quorax</h1>
    <p class="subtitle">Smart Finance Tracker API</p>
    <p style="margin-top:24px;color:#64748B">API is running. Download the app to get started.</p>
    <p style="margin-top:16px"><a href="/privacy">Privacy Policy</a></p>
    </div></body></html>
  `);
});

// Privacy Policy page (for Google OAuth verification)
app.get('/privacy', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Quorax - Privacy Policy</title><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:0 auto;padding:40px 20px;background:#F8FAFC;color:#1E293B;line-height:1.7}
    h1{color:#0D9488}h2{color:#334155;margin-top:32px}a{color:#0D9488}</style></head>
    <body>
    <h1>Quorax Privacy Policy</h1>
    <p><em>Last updated: June 2026</em></p>
    
    <h2>1. Information We Collect</h2>
    <p>When you use Quorax, we collect:</p>
    <ul>
      <li><strong>Account Information:</strong> Name, email address, and encrypted password when you register.</li>
      <li><strong>Financial Data:</strong> Transaction records, wallet balances, budget limits, and categories you create.</li>
      <li><strong>Device Information:</strong> Device type and operating system for app performance optimization.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>Provide and maintain the Quorax service</li>
      <li>Track your income, expenses, and budgets</li>
      <li>Generate financial reports and analytics</li>
      <li>Send budget alerts and notifications</li>
      <li>Authenticate your identity and secure your account</li>
    </ul>

    <h2>3. Data Storage & Security</h2>
    <ul>
      <li>Your data is stored securely in encrypted cloud databases.</li>
      <li>Passwords are hashed using bcrypt with a minimum cost factor of 10.</li>
      <li>All data transmission uses HTTPS encryption.</li>
      <li>Authentication tokens are stored securely on your device.</li>
    </ul>

    <h2>4. Data Sharing</h2>
    <p>We do NOT sell, trade, or share your personal or financial data with third parties. Your financial information is private and only accessible to you.</p>

    <h2>5. Google Sign-In</h2>
    <p>If you sign in with Google, we receive your name and email address from Google. We do not access your Google contacts, files, or any other Google data.</p>

    <h2>6. Data Retention & Deletion</h2>
    <p>Your data is retained as long as your account is active. If you delete your account, all associated data will be permanently removed from our servers within 30 days.</p>

    <h2>7. Your Rights</h2>
    <ul>
      <li>Access your personal data</li>
      <li>Correct inaccurate data</li>
      <li>Delete your account and data</li>
      <li>Export your financial data</li>
    </ul>

    <h2>8. Contact Us</h2>
    <p>If you have questions about this Privacy Policy, contact us at: <a href="mailto:sherwincari@gmail.com">sherwincari@gmail.com</a></p>
    </body></html>
  `);
});

// --------------- Error Handling ---------------

// Global error handler (must be registered AFTER routes)
app.use(errorHandler);

// --------------- Start Server ---------------

const PORT = parseInt(process.env.PORT, 10) || 3000;

// Only start listening when this file is run directly (not when imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Quorax server listening on port ${PORT}`);
  });
}

// Export for testing with supertest
module.exports = app;
