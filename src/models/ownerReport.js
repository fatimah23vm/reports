

// src/models/ownerReport.js
const client = require('../config/db');

// إنشاء جدول owner_reports
const createOwnerReportsTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS owner_reports (
        id SERIAL PRIMARY KEY,
        report_number VARCHAR(20) UNIQUE NOT NULL,
        engineer_name VARCHAR(255),
        owner_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        report_date DATE NOT NULL,
        workers_count INT DEFAULT 0,
        status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'completed')) DEFAULT 'sent',
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP
      );
    `);
    console.log('✅ Owner reports table created successfully');
  } catch (err) {
    console.error('❌ Error creating owner_reports table:', err.message);
  }
};

// ✅✅✅ دالة توليد رقم تقرير بالصيغة: R-0001, R-0002, ...
const generateReportNumber = async () => {
  try {
    // نجيب آخر رقم تقرير من الداتابيز
    const result = await client.query(`
      SELECT report_number FROM owner_reports 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      // استخراج الرقم من آخر تقرير (مثلاً: R-0001 -> 1)
      const lastReportNumber = result.rows[0].report_number;
      // إزالة "R-" ونحول الباقي لرقم
      const lastNumber = parseInt(lastReportNumber.replace('R-', ''));
      nextNumber = lastNumber + 1;
    }
    
    // توليد الرقم الجديد بالصيغة: R-0002, R-0003, ...
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `R-${formattedNumber}`;  // ✅ R-0001
    
  } catch (err) {
    console.error('❌ Error generating report number:', err.message);
    // لو صار خطأ، نستخدم الوقت الحالي
    const timestamp = Date.now().toString().slice(-4);
    return `R-${timestamp}`;  // ✅ R-1234
  }
};

module.exports = { createOwnerReportsTable, generateReportNumber };