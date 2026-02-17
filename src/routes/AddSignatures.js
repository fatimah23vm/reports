

// routes/Signatures.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

// إضافة توقيع
router.post('/:dailyReportId', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId } = req.params;
  const { signed_by, signature_data } = req.body;

  if (!signature_data) {
    return res.status(400).json({ message: 'Signature data required' });
  }

  try {
    const result = await client.query(
      `INSERT INTO signatures (daily_report_id, signed_by, signature_data)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [dailyReportId, signed_by || req.user.role, signature_data]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب التواقيع
router.get('/:dailyReportId', requireAuth, async (req, res) => {
  const { dailyReportId } = req.params;

  const result = await client.query(
    'SELECT * FROM signatures WHERE daily_report_id=$1',
    [dailyReportId]
  );

  res.json(result.rows);
});

// تعديل توقيع
router.put('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;
  const { signature_data } = req.body;

  try {
    const result = await client.query(
      `UPDATE signatures
       SET signature_data=$1, signed_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND daily_report_id=$3
       RETURNING *`,
      [signature_data, id, dailyReportId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Signature not found' });

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف توقيع
router.delete('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;

  const result = await client.query(
    'DELETE FROM signatures WHERE id=$1 AND daily_report_id=$2 RETURNING *',
    [id, dailyReportId]
  );

  if (!result.rows.length)
    return res.status(404).json({ message: 'Signature not found' });

  res.json({ message: 'Deleted successfully' });
});

module.exports = router;