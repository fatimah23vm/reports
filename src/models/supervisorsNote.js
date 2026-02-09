

const client = require('../config/db');

const createSupervisorsNotesTable = async () => {
  try {
    // إنشاء ENUM إذا ما كان موجود
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'action_taken_enum'
        ) THEN
          CREATE TYPE action_taken_enum AS ENUM (
            'approved',
            'approved_as_noted',
            'revised_and_resubmit'
          );
        END IF;
      END$$;
    `);

    // إنشاء جدول supervisors_notes
    await client.query(`
      CREATE TABLE IF NOT EXISTS supervisors_notes (
        id SERIAL PRIMARY KEY,
        inspection_request_id INT 
          REFERENCES inspection_requests(id)
          ON DELETE CASCADE,
        notes TEXT,
        action_taken action_taken_enum NOT NULL,
        supervisor_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Supervisors notes table created successfully');
  } catch (err) {
    console.error('Error creating supervisors_notes table:', err.message);
  }
};

createSupervisorsNotesTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));

module.exports = { createSupervisorsNotesTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/supervisorsNote.js