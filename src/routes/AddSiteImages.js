


const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إعدادات multer لتخزين الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // تأكد أن مجلد uploads موجود
    const dir = 'uploads/';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // اسم فريد لكل صورة
  }
});

const upload = multer({ storage: storage });

// رفع صورة للتقرير (Engineer فقط)

router.post('/:reportId', requireAuth, subAdminOnly, upload.single('image'), async (req, res) => {
  const { reportId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  const imagePath = req.file.path; // المسار المخزن على السيرفر

  try {
    const result = await client.query(
      'INSERT INTO site_images (report_id, image_path) VALUES ($1, $2) RETURNING *',
      [reportId, imagePath]
    );

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//  جلب كل الصور حسب report_id

router.get('/:reportId', requireAuth, async (req, res) => {
  const { reportId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM site_images WHERE report_id = $1 ORDER BY uploaded_at ASC',
      [reportId]
    );

    res.json({ images: result.rows });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//  حذف صورة (Engineer فقط)

router.delete('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    // جلب الصورة قبل الحذف لحذف الملف من السيرفر
    const imageResult = await client.query('SELECT image_path FROM site_images WHERE id = $1', [id]);
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const imagePath = imageResult.rows[0].image_path;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath); // حذف الملف من السيرفر
    }

    // حذف الصف من الداتابيس
    await client.query('DELETE FROM site_images WHERE id = $1', [id]);

    res.json({ message: 'Image deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
