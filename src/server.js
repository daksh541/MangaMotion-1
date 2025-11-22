// src/server.js
const express = require('express');
const authRoutes = require('./auth');
const requireAuth = require('./middleware/auth');

const app = express();

app.use('/auth', authRoutes);

// protected example
app.get('/protected', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening ${port}`));
