

const client = require('../config/db');

const createInspectionRequestsTable = async () => {
  try {
    //  إنشاء الجدول مع report_code مباشرة (لو الجدول موجود، يحافظ على الأعمدة القديمة)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inspection_requests (
        id SERIAL PRIMARY KEY,
        report_code VARCHAR(10) UNIQUE,
        owner VARCHAR(255),
        request_date DATE,
        site VARCHAR(255),
        site_engineer_name VARCHAR(255),
        item VARCHAR(255),
        inspection_location VARCHAR(255),
        contractor VARCHAR(255),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Inspection requests table checked/updated successfully');
  } catch (err) {
    console.error('Error in inspection_requests table:', err.message);
  }
};

createInspectionRequestsTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));

module.exports = { createInspectionRequestsTable };