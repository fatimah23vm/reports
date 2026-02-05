


const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, adminOnly } = require('../middlewares/authMiddleware');
const { generateReportNumber } = require('../models/ownerReport');

//  إضافة تقرير جديد (Admin فقط)
router.post('/add-report', requireAuth, adminOnly, async (req, res) => {
  const { engineer_name, owner_name, company_name, location, report_date, workers_count } = req.body;

  if (!owner_name || !company_name || !location || !report_date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const report_number = await generateReportNumber();

    const result = await client.query(
      `INSERT INTO owner_reports
      (report_number, engineer_name, owner_name, company_name, location, report_date, workers_count, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        report_number,
        engineer_name || null,
        owner_name,
        company_name,
        location,
        report_date,
        workers_count || 0,
        'sent',
        req.user.id
      ]
    );

    res.json({ message: 'Report created successfully', report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  تعديل تقرير (Admin فقط)
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const reportId = req.params.id;

  const { engineer_name, owner_name, company_name, location, report_date, workers_count, status } = req.body;

  try {
    const result = await client.query(
      `UPDATE owner_reports
       SET engineer_name=$1, owner_name=$2, company_name=$3, location=$4, report_date=$5, workers_count=$6, status=$7
       WHERE id=$8
       RETURNING *`,
      [engineer_name, owner_name, company_name, location, report_date, workers_count, status, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report updated successfully', report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//  حذف تقرير (Admin فقط)
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  const reportId = req.params.id;

  try {
    // نجيب حالة التقرير أولًا
    const check = await client.query(
      'SELECT status FROM owner_reports WHERE id = $1',
      [reportId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // لو التقرير مكتمل ما ينحذف
    if (check.rows[0].status === 'completed') {
      return res.status(403).json({
        message: 'Cannot delete a completed report'
      });
    }

    // الحذف
    await client.query(
      'DELETE FROM owner_reports WHERE id = $1',
      [reportId]
    );

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// جلب تقرير حسب ID (يرجع اسم الأدمن بدل ID)
router.get('/:id', requireAuth, async (req, res) => {
  const reportId = req.params.id;

  try {
    const result = await client.query(
      `
      SELECT 
        r.id,
        r.report_number,
        r.engineer_name,
        r.owner_name,
        r.company_name,
        r.location,
        r.report_date,
        r.workers_count,
        r.status,
        CASE 
          WHEN u.role = 'admin' THEN 'Admin'
          WHEN u.role = 'sub_admin' THEN 'Sub Admin'
        END AS created_by
      FROM owner_reports r
      JOIN users u ON r.created_by = u.id
      WHERE r.id = $1
      `,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
