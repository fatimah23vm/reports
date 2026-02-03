

// src/middlewares/authMiddleware.js
// Middleware للتحقق من JWT + صلاحيات

const jwt = require('jsonwebtoken');
const client = require('../config/db');

// 🔹 Middleware للتحقق من التوكن
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1️⃣ التحقق من صحة التوكن
    const decoded = jwt.verify(token, 'SECRET_KEY'); // لاحقًا نحط SECRET_KEY في .env

    // 2️⃣ جلب بيانات المستخدم من الداتابيس
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = result.rows[0]; // حفظ بيانات المستخدم في req.user
    next();

  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// 🔹 Admin فقط
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

// 🔹 Sub Admin (Engineer) فقط
const subAdminOnly = (req, res, next) => {
  if (req.user.role !== 'engineer') {
    return res.status(403).json({ message: 'Engineer access only' });
  }
  next();
};

module.exports = {
  requireAuth,
  adminOnly,
  subAdminOnly
};
