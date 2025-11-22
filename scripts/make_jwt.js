// scripts/make_jwt.js
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
const token = jwt.sign({ sub: 'dev', role: 'developer' }, secret, { expiresIn: '7d' });
console.log(token);
