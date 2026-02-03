

const express = require('express');
const router = express.Router();
const { requireAuth, adminOnly } = require('../middlewares/authMiddleware');
const client = require('../config/db'); // عشان نقدر نحفظ المهندسين في الداتابيز

// إضافة مهندس جديد (Admin فقط)
router.post('/add-engineer', requireAuth, adminOnly, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // تأكد إذا موجود مسبقاً
    const exists = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // تشفير الباسورد
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // إضافة المهندس
    await client.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, hashedPassword, 'engineer']
    );

    res.json({ message: 'Engineer added successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
