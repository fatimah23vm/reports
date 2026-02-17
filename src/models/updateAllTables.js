
const pool = require('../config/db');

const updateAllTables = async () => {
  try {
    console.log('🔄 بدأ تحديث جميع الجداول...\n');

    // 1️⃣ إنشاء daily_reports
    console.log('1️⃣ إنشاء daily_reports...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES owner_reports(id) ON DELETE CASCADE,
        report_date DATE NOT NULL DEFAULT CURRENT_DATE,
        report_number VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
        created_by VARCHAR(255),
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, report_date)
      );
    `);
    console.log('✅ daily_reports جاهز\n');

    // 2️⃣ تحديث work_items
    console.log('2️⃣ تحديث work_items...');
    await pool.query(`
      ALTER TABLE work_items 
      ADD COLUMN IF NOT EXISTS daily_report_id INT 
      REFERENCES daily_reports(id) ON DELETE CASCADE;
    `);
    console.log('✅ work_items محدث\n');

    // 3️⃣ تحديث materials
    console.log('3️⃣ تحديث materials...');
    await pool.query(`
      ALTER TABLE materials 
      ADD COLUMN IF NOT EXISTS daily_report_id INT 
      REFERENCES daily_reports(id) ON DELETE CASCADE;
    `);
    console.log('✅ materials محدث\n');

    // 4️⃣ تحديث next_day_plans
    console.log('4️⃣ تحديث next_day_plans...');
    await pool.query(`
      ALTER TABLE next_day_plans 
      ADD COLUMN IF NOT EXISTS daily_report_id INT 
      REFERENCES daily_reports(id) ON DELETE CASCADE;
    `);
    console.log('✅ next_day_plans محدث\n');

    // 5️⃣ تحديث site_images
    console.log('5️⃣ تحديث site_images...');
    await pool.query(`
      ALTER TABLE site_images 
      ADD COLUMN IF NOT EXISTS daily_report_id INT 
      REFERENCES daily_reports(id) ON DELETE CASCADE;
    `);
    console.log('✅ site_images محدث\n');

    // 6️⃣ تحديث signatures
    console.log('6️⃣ تحديث signatures...');
    await pool.query(`
      ALTER TABLE signatures 
      ADD COLUMN IF NOT EXISTS daily_report_id INT 
      REFERENCES daily_reports(id) ON DELETE CASCADE;
    `);
    console.log('✅ signatures محدث\n');

    console.log('🎉 تم تحديث جميع الجداول بنجاح!');
    console.log('📌 ملاحظة: الحقول القديمة report_id لسه موجودة');

  } catch (err) {
    console.error('❌ خطأ:', err.message);
  } finally {
    await pool.end();
  }
};

updateAllTables();
///Users/fatimahadeeb/Desktop/reports/src/models/updateAllTables.js