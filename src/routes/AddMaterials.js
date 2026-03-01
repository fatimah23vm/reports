

// routes/AddMaterials.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

// إضافة مادة
router.post('/:dailyReportId', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId } = req.params;
  const { material_name, material_type, quantity, storage_location, supplier_name, supplier_contact, supply_location } = req.body;

  if (!material_name) {
    return res.status(400).json({ message: 'material_name is required' });
  }

  try {
    const report = await client.query(
      'SELECT * FROM daily_reports WHERE id=$1',
      [dailyReportId]
    );

    if (report.rows.length === 0) return res.status(404).json({ message: 'Daily report not found' });

    // ✅ لم نعد نتحقق من حالة التقرير هنا

    const result = await client.query(
      `INSERT INTO materials
       (daily_report_id, material_name, material_type, quantity, storage_location, supplier_name, supplier_contact, supply_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [dailyReportId, material_name, material_type || null, quantity || 0, storage_location || null, supplier_name || null, supplier_contact || null, supply_location || null]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب مواد
router.get('/:dailyReportId', requireAuth, async (req, res) => {
  const { dailyReportId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM materials WHERE daily_report_id = $1 ORDER BY id ASC',
      [dailyReportId]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تعديل مادة
router.put('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;
  const {
    material_name,
    material_type,
    quantity,
    storage_location,
    supplier_name,
    supplier_contact,
    supply_location
  } = req.body;

  try {
    const result = await client.query(
      `UPDATE materials
       SET material_name=$1,
           material_type=$2,
           quantity=$3,
           storage_location=$4,
           supplier_name=$5,
           supplier_contact=$6,
           supply_location=$7
       WHERE id=$8 AND daily_report_id=$9
       RETURNING *`,
      [
        material_name,
        material_type,
        quantity,
        storage_location,
        supplier_name,
        supplier_contact,
        supply_location,
        id,
        dailyReportId
      ]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Material not found' });

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف مادة
router.delete('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM materials WHERE id=$1 AND daily_report_id=$2 RETURNING *',
      [id, dailyReportId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Material not found' });

    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;