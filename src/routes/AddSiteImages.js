

// routes/SiteImages.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إعداد multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// رفع صورة
router.post('/:dailyReportId', requireAuth, subAdminOnly, upload.single('image'), async (req, res) => {
  const { dailyReportId } = req.params;

  if (!req.file)
    return res.status(400).json({ message: 'No image uploaded' });

  try {
    const result = await client.query(
      'INSERT INTO site_images (daily_report_id, image_path) VALUES ($1,$2) RETURNING *',
      [dailyReportId, req.file.path]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب الصور
router.get('/:dailyReportId', requireAuth, async (req, res) => {
  const { dailyReportId } = req.params;

  const result = await client.query(
    'SELECT * FROM site_images WHERE daily_report_id=$1 ORDER BY uploaded_at ASC',
    [dailyReportId]
  );

  res.json(result.rows);
});

// حذف صورة
router.delete('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;

  try {
    const imageResult = await client.query(
      'SELECT image_path FROM site_images WHERE id=$1 AND daily_report_id=$2',
      [id, dailyReportId]
    );

    if (!imageResult.rows.length)
      return res.status(404).json({ message: 'Image not found' });

    const imagePath = imageResult.rows[0].image_path;

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await client.query(
      'DELETE FROM site_images WHERE id=$1 AND daily_report_id=$2',
      [id, dailyReportId]
    );

    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;