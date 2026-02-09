


const express = require('express');
const router = express.Router();
const client = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await client.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // توليد JWT
  const token = jwt.sign(
    { id: user.id, role: user.role },
    'SECRET_KEY', // لاحقًا نحطها في ملف .env
    { expiresIn: '1d' }
  );

  res.json({
    message: 'Login successful',
    token,     // هذا هو JWT
    role: user.role
  });
});

module.exports = router;
///Users/fatimahadeeb/Desktop/Dit Projects/src/routes/auth.js