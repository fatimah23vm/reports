
const client = require('../config/db');

const createOwnerReportsTable = async () => {
  try {
    // إنشاء sequence لو ما موجود
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS report_seq START 1;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS owner_reports (
        id SERIAL PRIMARY KEY,
        report_number VARCHAR(50) UNIQUE NOT NULL DEFAULT 'RPT-' || nextval('report_seq'),
        engineer_name VARCHAR(255),
        owner_name VARCHAR(255),
        company_name VARCHAR(255),
        location VARCHAR(255),
        report_date DATE NOT NULL,
        workers_count INT,
        status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'completed')),
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Owner reports table created successfully');
  } catch (err) {
    console.error('Error creating owner reports table:', err.message);
  }
};
createOwnerReportsTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
module.exports = { createOwnerReportsTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/ownerReport.js