

const client = require('../config/db');

const createSiteImagesTable = async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_images (
        id SERIAL PRIMARY KEY,
        report_id INT REFERENCES owner_reports(id) ON DELETE CASCADE,
        image_path TEXT, -- يخزن مسار الملف أو رابط أو base64
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Site images table created successfully');
  } catch (err) {
    console.error('Error creating site images table:', err.message);
  }
};
createSiteImagesTable()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
module.exports = { createSiteImagesTable };
///Users/fatimahadeeb/Desktop/Dit Projects/src/models/siteImage.js