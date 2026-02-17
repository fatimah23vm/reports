

// routes/NextDayPlans.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

// إضافة
router.post('/:dailyReportId', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId } = req.params;
  const { description } = req.body;

  if (!description)
    return res.status(400).json({ message: 'Description required' });

  try {
    const result = await client.query(
      'INSERT INTO next_day_plans (daily_report_id, description) VALUES ($1,$2) RETURNING *',
      [dailyReportId, description]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب
router.get('/:dailyReportId', requireAuth, async (req, res) => {
  const { dailyReportId } = req.params;

  const result = await client.query(
    'SELECT * FROM next_day_plans WHERE daily_report_id=$1 ORDER BY id ASC',
    [dailyReportId]
  );

  res.json(result.rows);
});

// تعديل
router.put('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;
  const { description } = req.body;

  const result = await client.query(
    'UPDATE next_day_plans SET description=$1 WHERE id=$2 AND daily_report_id=$3 RETURNING *',
    [description, id, dailyReportId]
  );

  if (!result.rows.length)
    return res.status(404).json({ message: 'Not found' });

  res.json(result.rows[0]);
});

// حذف
router.delete('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;

  const result = await client.query(
    'DELETE FROM next_day_plans WHERE id=$1 AND daily_report_id=$2 RETURNING *',
    [id, dailyReportId]
  );

  if (!result.rows.length)
    return res.status(404).json({ message: 'Not found' });

  res.json({ message: 'Deleted successfully' });
});

module.exports = router;