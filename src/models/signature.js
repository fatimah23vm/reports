

const client = require('../config/db');

const createSignaturesTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS signatures (
        id SERIAL PRIMARY KEY,
        report_id INT REFERENCES owner_reports(id) ON DELETE CASCADE,
        signed_by VARCHAR(255), -- اسم المهندس أو الدور
        signature_data TEXT,   -- التوقيع المرسوم (base64)
        signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Signatures table created successfully');
  } catch (err) {
    console.error('Error creating signatures table:', err.message);
  }
};
createSignaturesTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
module.exports = { createSignaturesTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/signature.js