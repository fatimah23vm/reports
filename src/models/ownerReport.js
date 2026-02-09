


const client = require('../config/db');

// إنشاء جدول owner_reports
const createOwnerReportsTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS owner_reports (
        id SERIAL PRIMARY KEY,
        report_number VARCHAR(20) UNIQUE NOT NULL,
        engineer_name VARCHAR(255),
        owner_name VARCHAR(255),
        company_name VARCHAR(255),
        location VARCHAR(255),
        report_date DATE NOT NULL,
        workers_count INT DEFAULT 0,
        status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'completed')) DEFAULT 'sent',
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP
      );
    `);
    console.log('Owner reports table created successfully');
  } catch (err) {
    console.error('Error creating owner_reports table:', err.message);
  }
};

//  توليد رقم تقرير بصيغة 0001-R, 0002-R ...
const generateReportNumber = async () => {
  try {
    const result = await client.query('SELECT COUNT(*) FROM owner_reports');
    const count = parseInt(result.rows[0].count) + 1;
    const number = count.toString().padStart(4, '0'); // 0001, 0002, ...
    return `${number}-R`;
  } catch (err) {
    console.error('Error generating report number:', err.message);
    return `0000-R`;
  }
};

module.exports = { createOwnerReportsTable, generateReportNumber };
