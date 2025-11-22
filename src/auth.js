// src/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// NOTE: replace this with real user validation (DB) immediately
const dummyUserValidate = (username, password) => {
  return username === 'dev' && password === 'devpass';
};

router.post('/login', express.json(), (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || !dummyUserValidate(username, password)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const payload = { sub: username, role: 'developer' }; // keep minimal
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token, expiresIn: JWT_EXPIRES_IN });
});

module.exports = router;
