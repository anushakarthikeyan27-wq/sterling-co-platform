const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Professional = require('../models/Professional');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, location } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const emailVerifyToken = crypto.randomBytes(20).toString('hex');

    const user = await User.create({ name, email, passwordHash, role, location, emailVerifyToken });

    // If signing up as a professional, create the linked profile shell
    if (role === 'professional') {
      await Professional.create({ user: user._id, role: 'New professional', specialty: 'Other' });
    }

    // In production: send emailVerifyToken via a real email service (e.g. SendGrid, SES)
    console.log(`Verification token for ${email}: ${emailVerifyToken}`);

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
  const user = await User.findOne({ emailVerifyToken: req.params.token });
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });
  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save();
  res.json({ message: 'Email verified' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' }); // don't leak which emails exist

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  // In production: email this link instead of logging it
  console.log(`Password reset token for ${user.email}: ${resetToken}`);
  res.json({ message: 'If that email exists, a reset link has been sent' });
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

  user.passwordHash = await bcrypt.hash(req.body.password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated' });
});

module.exports = router;
