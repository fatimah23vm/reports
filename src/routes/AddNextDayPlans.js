

const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');


// ✅ إضافة خطة لليوم التالي (Engineer فقط)
router.post('/', requireAuth, subAdminOnly, async (req, res) => {
  const { report_id, description } = req.body;

  if (!report_id || !description) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await client.query(
      `INSERT INTO next_day_plans (report_id, description)
       VALUES ($1, $2)
       RETURNING *`,
      [report_id, description]
    );

    res.json({
      message: 'Next day plan added successfully',
      next_day_plan: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ جلب خطط اليوم التالي حسب التقرير
router.get('/:reportId', requireAuth, async (req, res) => {
  const { reportId } = req.params;

  try {
    const result = await client.query(
      `SELECT * FROM next_day_plans
       WHERE report_id = $1
       ORDER BY id ASC`,
      [reportId]
    );

    res.json({ next_day_plans: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ تعديل خطة (Engineer فقط)
router.put('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ message: 'Description is required' });
  }

  try {
    const result = await client.query(
      `UPDATE next_day_plans
       SET description = $1
       WHERE id = $2
       RETURNING *`,
      [description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Next day plan not found' });
    }

    res.json({
      message: 'Next day plan updated successfully',
      next_day_plan: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ حذف خطة (Engineer فقط)
router.delete('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      `DELETE FROM next_day_plans
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Next day plan not found' });
    }

    res.json({ message: 'Next day plan deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
