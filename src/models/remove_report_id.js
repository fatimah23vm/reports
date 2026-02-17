
const pool = require('../config/db');

const removeReportIdColumn = async () => {
  try {
    console.log('🔧 بدأ حذف عمود report_id من جميع الجداول...\n');

    // حذف report_id من work_items
    console.log('1️⃣ حذف من work_items...');
    await pool.query(`ALTER TABLE work_items DROP COLUMN IF EXISTS report_id;`);
    console.log('✅ تم حذف report_id من work_items\n');

    // حذف report_id من materials
    console.log('2️⃣ حذف من materials...');
    await pool.query(`ALTER TABLE materials DROP COLUMN IF EXISTS report_id;`);
    console.log('✅ تم حذف report_id من materials\n');

    // حذف report_id من next_day_plans
    console.log('3️⃣ حذف من next_day_plans...');
    await pool.query(`ALTER TABLE next_day_plans DROP COLUMN IF EXISTS report_id;`);
    console.log('✅ تم حذف report_id من next_day_plans\n');

    // حذف report_id من site_images
    console.log('4️⃣ حذف من site_images...');
    await pool.query(`ALTER TABLE site_images DROP COLUMN IF EXISTS report_id;`);
    console.log('✅ تم حذف report_id من site_images\n');

    // حذف report_id من signatures
    console.log('5️⃣ حذف من signatures...');
    await pool.query(`ALTER TABLE signatures DROP COLUMN IF EXISTS report_id;`);
    console.log('✅ تم حذف report_id من signatures\n');

    console.log('🎉 تم حذف report_id من جميع الجداول بنجاح!');

  } catch (err) {
    console.error('❌ خطأ:', err.message);
  } finally {
    await pool.end();
  }
};

removeReportIdColumn();