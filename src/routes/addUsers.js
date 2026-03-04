

const express = require('express');
const router = express.Router();
const { requireAuth, adminOnly } = require('../middlewares/authMiddleware');
const client = require('../config/db');  // ✅ هذا موجود مرة وحدة فقط

//  إضافة مهندس جديد
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

//  جلب جميع المهندسين
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

//  جلب مهندس واحد
router.get('/engineer/:id', requireAuth, adminOnly, async (req, res) => {
  const engineerId = req.params.id;
  console.log('🔍 Fetching engineer with ID:', engineerId);

  try {
    const result = await client.query(
      `SELECT id, username, role
       FROM users 
       WHERE id = $1 AND role = 'sub_admin'`,
      [engineerId]
    );

    if (result.rows.length === 0) {
      console.log('❌ Engineer not found with ID:', engineerId);
      return res.status(404).json({ message: 'Engineer not found' });
    }

    console.log('✅ Engineer found:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching engineer:', err.message);
    res.status(500).json({ message: err.message });
  }
});


// تحديث بيانات مهندس
router.put('/engineer/:id', requireAuth, adminOnly, async (req, res) => {
  const engineerId = req.params.id;
  const { username, password } = req.body;

  // التحقق من وجود اسم مستخدم
  if (!username) {
    return res.status(400).json({ message: 'اسم المستخدم مطلوب' });
  }

  try {
    //  التحقق من وجود المهندس
    const userCheck = await client.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [engineerId, 'sub_admin']
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'المهندس غير موجود' });
    }

    //  إذا تم إرسال كلمة مرور جديدة نشفرها 
    let hashedPassword = null;
    if (password && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      hashedPassword = await bcrypt.hash(password, 10);
    }

    //  (تحديث فقط الحقول المرسلة)
    let updateQuery = 'UPDATE users SET username = $1';
    const queryParams = [username];
    let paramIndex = 2;

    if (hashedPassword) {
      updateQuery += `, password = $${paramIndex}`;
      queryParams.push(hashedPassword);
      paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING id, username, role`;
    queryParams.push(engineerId);

    //  تنفيذ عملية التحديث
    const result = await client.query(updateQuery, queryParams);

    console.log('✅ Engineer updated successfully:', result.rows[0]);
    res.json({
      message: 'تم تحديث المهندس بنجاح',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Error updating engineer:', err.message);
    // التحقق من خطأ وحدة المستخدم المكرر (إذا حاول تغيير اسم المستخدم لاسم موجود مسبقاً)
    if (err.code === '23505') { // كود خطأ التكرار في PostgreSQL
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل، الرجاء اختيار اسم آخر' });
    }
    res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء التحديث' });
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
///Users/fatimahadeeb/Desktop/reports/src/routes/addUsers.js