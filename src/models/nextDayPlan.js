

const client = require('../config/db');

const createNextDayPlansTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS next_day_plans (
        id SERIAL PRIMARY KEY,
        report_id INT REFERENCES owner_reports(id) ON DELETE CASCADE,
        description TEXT
      );
    `);
    console.log('Next day plans table created successfully');
  } catch (err) {
    console.error('Error creating next day plans table:', err.message);
  }
};
createNextDayPlansTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
module.exports = { createNextDayPlansTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/nextDayPlan.js
