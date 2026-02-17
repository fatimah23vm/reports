const pool = require('../config/db');

const createDailyReportsTable = async () => {
  try {
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
    console.log('✅ Daily reports table created successfully');
  } catch (err) {
    console.error('❌ Error creating daily_reports table:', err.message);
  }
};

// للتشغيل المباشر
if (require.main === module) {
  createDailyReportsTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { createDailyReportsTable };
///Users/fatimahadeeb/Desktop/reports/src/models/dailyReport.js