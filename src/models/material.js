



const client = require('../config/db');

const createMaterialsTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        report_id INT REFERENCES owner_reports(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,        -- اسم الخامه
        material_type VARCHAR(255),                  -- نوع الخامه
        quantity INT,                                -- الكمية
        storage_location VARCHAR(255),               -- مكان التخزين
        supplier_name VARCHAR(255),                  -- اسم المورد
        supplier_contact VARCHAR(50),                -- رقم التواصل
        supply_location VARCHAR(255)                 -- مكان التوريد
      );
    `);
    console.log('Materials table created successfully');
  } catch (err) {
    console.error('Error creating materials table:', err.message);
  }
};

createMaterialsTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));

module.exports = { createMaterialsTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/material.js