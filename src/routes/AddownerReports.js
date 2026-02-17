

// src/routes/AddownerReports.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth } = require('../middlewares/authMiddleware');
const { generateReportNumber } = require('../models/ownerReport');

// ✅ إضافة مشروع جديد - للـ Admin فقط
router.post('/add-report', requireAuth, async (req, res) => {
  const { engineer_name, owner_name, company_name, location, report_date, workers_count } = req.body;

  // ✅ التحقق من أن المستخدم Admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }

  if (!engineer_name || !owner_name || !company_name || !location || !report_date || !workers_count) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }

  try {
    let report_number;
    let unique = false;
    let attempts = 0;
    
    while (!unique && attempts < 5) {
      report_number = await generateReportNumber();
      
      const check = await client.query(
        'SELECT id FROM owner_reports WHERE report_number = $1',
        [report_number]
      );
      
      if (check.rows.length === 0) {
        unique = true;
      }
      attempts++;
    }
    
    if (!unique) {
      report_number = `R-${Date.now().toString().slice(-4)}`;
    }

    const result = await client.query(
      `INSERT INTO owner_reports
      (report_number, engineer_name, owner_name, company_name, location, report_date, workers_count, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        report_number,
        engineer_name,
        owner_name,
        company_name,
        location,
        report_date,
        workers_count,
        'sent',
        req.user.id
      ]
    );

    res.json({ 
      message: '✅ تم إنشاء المشروع بنجاح', 
      report: result.rows[0] 
    });
    
  } catch (err) {
    console.error('❌ Error creating report:', err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ جلب جميع المشاريع - للـ Admin والمهندسين
router.get('/reports', requireAuth, async (req, res) => {
  try {
    const result = await client.query(
      `SELECT 
        r.id,
        r.report_number,
        r.engineer_name,
        r.owner_name,
        r.company_name,
        r.location,
        TO_CHAR(r.report_date, 'YYYY-MM-DD') as report_date,
        r.workers_count,
        r.status,
        r.created_at,
        u.username as created_by_name
      FROM owner_reports r
      JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ جلب مشروع واحد - للـ Admin والمهندسين
router.get('/:id', requireAuth, async (req, res) => {
  const reportId = req.params.id;

  try {
    const result = await client.query(
      `SELECT 
        r.id,
        r.report_number,
        r.engineer_name,
        r.owner_name,
        r.company_name,
        r.location,
        TO_CHAR(r.report_date, 'YYYY-MM-DD') as report_date,
        r.workers_count,
        r.status,
        r.created_at,
        u.username as created_by_name
      FROM owner_reports r
      JOIN users u ON r.created_by = u.id
      WHERE r.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅✅✅ تعديل مشروع - للـ Admin والمهندس المسؤول فقط
router.put('/:id', requireAuth, async (req, res) => {
  const reportId = req.params.id;
  const { engineer_name, owner_name, company_name, location, report_date, workers_count, status } = req.body;

  if (!engineer_name || !owner_name || !company_name || !location || !report_date || !workers_count) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }

  try {
    // ✅ التحقق من وجود المشروع وصلاحية المستخدم
    const report = await client.query(
      'SELECT engineer_name, status FROM owner_reports WHERE id = $1',
      [reportId]
    );

    if (report.rows.length === 0) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // ✅ التحقق من الصلاحية: Admin أو المهندس المسؤول
    if (req.user.role !== 'admin' && report.rows[0].engineer_name !== req.user.username) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذا المشروع' });
    }

    // ✅ إذا كان التقرير مكتمل، لا يمكن التعديل
    if (report.rows[0].status === 'completed' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'لا يمكن تعديل تقرير مكتمل' });
    }

    const result = await client.query(
      `UPDATE owner_reports
       SET engineer_name = $1, 
           owner_name = $2, 
           company_name = $3, 
           location = $4, 
           report_date = $5, 
           workers_count = $6, 
           status = $7
       WHERE id = $8
       RETURNING *`,
      [engineer_name, owner_name, company_name, location, report_date, workers_count, status, reportId]
    );

    res.json({ 
      message: '✅ تم تحديث المشروع بنجاح', 
      report: result.rows[0] 
    });
  } catch (err) {
    console.error('❌ Error updating report:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅✅✅ حذف مشروع - للـ Admin والمهندس المسؤول فقط
router.delete('/:id', requireAuth, async (req, res) => {
  const reportId = req.params.id;

  try {
    // ✅ التحقق من وجود المشروع وصلاحية المستخدم
    const check = await client.query(
      'SELECT status, engineer_name FROM owner_reports WHERE id = $1',
      [reportId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // ✅ التحقق من الصلاحية: Admin أو المهندس المسؤول
    if (req.user.role !== 'admin' && check.rows[0].engineer_name !== req.user.username) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذا المشروع' });
    }

    // ✅ لا نسمح بحذف المشاريع المكتملة
    if (check.rows[0].status === 'completed') {
      return res.status(403).json({
        message: 'لا يمكن حذف مشروع مكتمل'
      });
    }

    // حذف المشروع
    await client.query(
      'DELETE FROM owner_reports WHERE id = $1',
      [reportId]
    );

    res.json({ message: '✅ تم حذف المشروع بنجاح' });
  } catch (err) {
    console.error('❌ Error deleting report:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
///Users/fatimahadeeb/Desktop/reports/src/routes/AddownerReports.js