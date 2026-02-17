


const express = require('express');
const router = express.Router();
const { requireAuth, adminOnly } = require('../middlewares/authMiddleware');
const client = require('../config/db');

// ✅ إضافة مهندس جديد
router.post('/add-engineer', requireAuth, adminOnly, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const exists = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, hashedPassword, 'sub_admin']
    );

    res.json({ message: '✅ Engineer added successfully' });
  } catch (err) {
    console.error('❌ Error adding engineer:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ جلب جميع المهندسين - بدون تعليق داخل الكوير
router.get('/engineers', requireAuth, adminOnly, async (req, res) => {
  try {
    console.log('📊 Fetching engineers...');
    const result = await client.query(
     `SELECT id, username, role
      FROM users 
      WHERE role = 'sub_admin'
      ORDER BY id DESC`
    );
    
    console.log(`✅ Found ${result.rows.length} engineers`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching engineers:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ حذف مهندس
router.delete('/engineer/:id', requireAuth, adminOnly, async (req, res) => {
  const engineerId = req.params.id;

  try {
    const exists = await client.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [engineerId, 'sub_admin']
    );

    if (exists.rows.length === 0) {
      return res.status(404).json({ message: 'Engineer not found' });
    }

    await client.query('DELETE FROM users WHERE id = $1', [engineerId]);

    res.json({ message: '✅ Engineer deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting engineer:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// // src/routes/addUsers.js
// const express = require('express');
// const router = express.Router();
// const { requireAuth, adminOnly } = require('../middlewares/authMiddleware');
// const client = require('../config/db');

// // ✅ إضافة مهندس جديد
// router.post('/add-engineer', requireAuth, adminOnly, async (req, res) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     return res.status(400).json({ message: 'Username and password are required' });
//   }

//   try {
//     const exists = await client.query(
//       'SELECT * FROM users WHERE username = $1',
//       [username]
//     );

//     if (exists.rows.length > 0) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const bcrypt = require('bcrypt');
//     const hashedPassword = await bcrypt.hash(password, 10);

//     await client.query(
//       'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
//       [username, hashedPassword, 'engineer']
//     );

//     res.json({ message: '✅ Engineer added successfully' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ✅ جلب جميع المهندسين
// router.get('/engineers', requireAuth, adminOnly, async (req, res) => {
//   try {
//     const result = await client.query(
//       `SELECT id, username, role, created_at 
//        FROM users 
//        WHERE role = 'engineer' 
//        ORDER BY created_at DESC`
//     );
    
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ✅✅✅ حذف مهندس - تأكد من السبيلنج
// router.delete('/engineer/:id', requireAuth, adminOnly, async (req, res) => {
//   const engineerId = req.params.id;
//   console.log('🗑️ Deleting engineer with ID:', engineerId); // للتأكد

//   try {
//     // نتحقق إذا المهندس موجود
//     const exists = await client.query(
//       'SELECT * FROM users WHERE id = $1 AND role = $2',
//       [engineerId, 'engineer']
//     );

//     if (exists.rows.length === 0) {
//       console.log('❌ Engineer not found with ID:', engineerId);
//       return res.status(404).json({ message: 'Engineer not found' });
//     }

//     // حذف المهندس
//     await client.query(
//       'DELETE FROM users WHERE id = $1',
//       [engineerId]
//     );

//     console.log('✅ Engineer deleted successfully:', engineerId);
//     res.json({ message: '✅ Engineer deleted successfully' });
//   } catch (err) {
//     console.error('❌ Error deleting engineer:', err.message);
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;