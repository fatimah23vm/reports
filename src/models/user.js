

const client = require('../config/db');
const bcrypt = require('bcrypt');

// 1️⃣ إنشاء جدول المستخدمين
const createUsersTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sub_admin'))
      );
    `);
    console.log('✅ Users table ready');
  } catch (err) {
    console.error('❌ Error creating users table:', err.message);
  }
};

//  إنشاء المستخدمين الثابتين (مرة وحدة فقط)
const createDefaultUsers = async () => {
  try {
    // ===== Admin =====
    const adminExists = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['Admin@sa.com']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin_123', 10);

      await client.query(
        `INSERT INTO users (username, password, role)
         VALUES ($1, $2, $3)`,
        ['Admin@sa.com', hashedPassword, 'admin']
      );

      console.log('✅ Admin user created');
    }

    // ===== Sub Admin (Engineer) =====
    const subAdminExists = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['SubAdmin@sa.com']
    );

    if (subAdminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Subadmin_123', 10);

      await client.query(
        `INSERT INTO users (username, password, role)
         VALUES ($1, $2, $3)`,
        ['SubAdmin@sa.com', hashedPassword, 'sub_admin']
      );

      console.log('✅ Sub Admin (Engineer) user created');
    }

  } catch (err) {
    console.error('❌ Error creating default users:', err.message);
  }
};

// 3️⃣ تشغيل التهيئة
const initUsers = async () => {
  await createUsersTable();
  await createDefaultUsers();
};

module.exports = { initUsers };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/user.js