

const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');


// إضافة Work Item (المهندس فقط)

router.post('/:reportId', requireAuth, subAdminOnly, async (req, res) => {
  const { reportId } = req.params;
  const { item_name, work_area, workers_count, quantity } = req.body;

  if (!item_name || !work_area) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // التأكد أن التقرير موجود ولم يكتمل
    const report = await client.query(
      'SELECT status FROM owner_reports WHERE id = $1',
      [reportId]
    );

    if (report.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.rows[0].status === 'completed') {
      return res.status(403).json({
        message: 'Cannot edit work items for a completed report'
      });
    }

    const result = await client.query(
      `
      INSERT INTO work_items
      (report_id, item_name, work_area, workers_count, quantity)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        reportId,
        item_name,
        work_area,
        workers_count || 0,
        quantity || 0
      ]
    );

    res.json({
      message: 'Work item added successfully',
      work_item: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

 //جلب Work Items حسب التقرير

router.get('/:reportId', requireAuth, async (req, res) => {
  const { reportId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM work_items WHERE report_id = $1 ORDER BY id ASC',
      [reportId]
    );

    res.json({ work_items: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


 //تعديل Work Item (المهندس فقط)

router.put('/item/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;
  const { item_name, work_area, workers_count, quantity } = req.body;

  try {
    const result = await client.query(
      `
      UPDATE work_items
      SET item_name = $1,
          work_area = $2,
          workers_count = $3,
          quantity = $4
      WHERE id = $5
      RETURNING *
      `,
      [item_name, work_area, workers_count, quantity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    res.json({
      message: 'Work item updated successfully',
      work_item: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//حذف Work Item (المهندس فقط)

router.delete('/item/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM work_items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    res.json({ message: 'Work item deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
