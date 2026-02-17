

// routes/WorkItems.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

// إضافة Work Item
router.post('/:dailyReportId', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId } = req.params;
  const { item_name, work_area, workers_count, quantity } = req.body;

  if (!item_name || !work_area) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await client.query(
      `INSERT INTO work_items
       (daily_report_id, item_name, work_area, workers_count, quantity)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        dailyReportId,
        item_name,
        work_area,
        workers_count || 0,
        quantity || 0
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب Work Items
router.get('/:dailyReportId', requireAuth, async (req, res) => {
  const { dailyReportId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM work_items WHERE daily_report_id=$1 ORDER BY id ASC',
      [dailyReportId]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تعديل Work Item
router.put('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;
  const { item_name, work_area, workers_count, quantity } = req.body;

  try {
    const result = await client.query(
      `UPDATE work_items
       SET item_name=$1,
           work_area=$2,
           workers_count=$3,
           quantity=$4
       WHERE id=$5 AND daily_report_id=$6
       RETURNING *`,
      [item_name, work_area, workers_count, quantity, id, dailyReportId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Work item not found' });

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف Work Item
router.delete('/:dailyReportId/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { dailyReportId, id } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM work_items WHERE id=$1 AND daily_report_id=$2 RETURNING *',
      [id, dailyReportId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Work item not found' });

    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;