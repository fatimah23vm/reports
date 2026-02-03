

const client = require('../config/db');

const createWorkItemsTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_items (
        id SERIAL PRIMARY KEY,
        report_id INT REFERENCES owner_reports(id) ON DELETE CASCADE,
        item_name VARCHAR(255),
        work_area VARCHAR(255),
        workers_count INT,
        quantity INT
      );
    `);
    console.log('Work items table created successfully');
  } catch (err) {
    console.error('Error creating work items table:', err.message);
  }
};
createWorkItemsTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
module.exports = { createWorkItemsTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/workItem.js