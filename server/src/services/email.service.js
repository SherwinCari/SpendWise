'use strict';

/**
 * Email Service
 * Uses nodemailer with SMTP for sending transactional emails.
 * Configured via environment variables.
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: parseInt(process.env.SMTP_PORT, 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a verification code email for password change.
 * @param {string} toEmail - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<void>}
 */
async function sendPasswordChangeCode(toEmail, code) {
  const from = process.env.SMTP_FROM || '"Quorax" <noreply@quorax.app>';

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'Quorax - Password Change Verification Code',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0D9488;">Password Change Request</h2>
        <p>You requested to change your password. Use the code below to verify:</p>
        <div style="background: #F1F5F9; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #0D9488;">${code}</span>
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #64748B; font-size: 13px;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="color: #94A3B8; font-size: 12px;">Quorax - Finance Tracker</p>
      </div>
    `,
    text: `Your Quorax password change code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendPasswordChangeCode,
};
