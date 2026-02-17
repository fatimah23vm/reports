

const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

// ========== للتصحيح - يتأكد أن الراوتر شغال ==========
console.log('✅ Loading daily reports routes...');

// ✅ ========== أولاً: الراوات المحددة (specific routes) ==========

// جلب تقرير اليوم أو إنشاؤه (للمهندس)
router.get('/project/:projectId/today', requireAuth, async (req, res) => {
  console.log('📋 /project/:projectId/today route called for project:', req.params.projectId);
  const { projectId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    const report = await client.query(
      `SELECT * FROM daily_reports 
       WHERE project_id = $1 AND report_date = $2`,
      [projectId, today]
    );

    if (report.rows.length > 0) {
      return res.json({ report: report.rows[0] });
    }

    const project = await client.query(
      'SELECT report_number FROM owner_reports WHERE id = $1',
      [projectId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    const projectNumber = project.rows[0].report_number;
    const reportNumber = `${projectNumber}-${today.replace(/-/g, '')}`;

    const newReport = await client.query(
      `INSERT INTO daily_reports (project_id, report_date, report_number, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, today, reportNumber, req.user.username]
    );

    res.json({ report: newReport.rows[0] });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب كل تقارير مشروع معين
router.get('/project/:projectId/all', requireAuth, async (req, res) => {
  console.log('📋 /project/:projectId/all route called for project:', req.params.projectId);
  const { projectId } = req.params;

  try {
    const result = await client.query(
      `SELECT * FROM daily_reports 
       WHERE project_id = $1 
       ORDER BY report_date DESC`,
      [projectId]
    );

    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب آخر تقرير يومي لمشروع معين
router.get('/project/:projectId/latest', requireAuth, async (req, res) => {
  console.log('📋 /project/:projectId/latest route called for project:', req.params.projectId);
  const { projectId } = req.params;

  try {
    const result = await client.query(
      `SELECT * FROM daily_reports 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'لا يوجد تقرير يومي لهذا المشروع' 
      });
    }

    res.json({ report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب آخر تقرير مكتمل (submitted) لمشروع معين
router.get('/project/:projectId/latest-submitted', requireAuth, async (req, res) => {
  console.log('🔥🔥🔥 /project/:projectId/latest-submitted route called for project:', req.params.projectId);
  const { projectId } = req.params;

  try {
    const result = await client.query(
      `SELECT * FROM daily_reports 
       WHERE project_id = $1 AND status = 'submitted'
       ORDER BY submitted_at DESC 
       LIMIT 1`,
      [projectId]
    );

    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'لا يوجد تقارير مكتملة لهذا المشروع' 
      });
    }

    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error('Error in latest-submitted:', err);
    res.status(500).json({ message: err.message });
  }
});

// جلب كل التقارير المكتملة لمشروع معين
router.get('/project/:projectId/submitted', requireAuth, async (req, res) => {
  console.log('📋 /project/:projectId/submitted route called for project:', req.params.projectId);
  const { projectId } = req.params;

  try {
    const result = await client.query(
      `SELECT * FROM daily_reports 
       WHERE project_id = $1 AND status = 'submitted'
       ORDER BY submitted_at DESC`,
      [projectId]
    );

    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ ========== ثانياً: الراوات الديناميكية (dynamic routes) ==========

// جلب تقرير محدد
router.get('/:reportId', requireAuth, async (req, res) => {
  console.log('📋 /:reportId route called for report:', req.params.reportId);
  const { reportId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM daily_reports WHERE id = $1',
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'التقرير غير موجود' });
    }

    res.json({ report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تعديل تقرير (المهندس فقط)
router.put('/:reportId', requireAuth, subAdminOnly, async (req, res) => {
  const { reportId } = req.params;
  const { report_date, status } = req.body;

  try {
    const checkReport = await client.query(
      'SELECT * FROM daily_reports WHERE id = $1',
      [reportId]
    );

    if (checkReport.rows.length === 0) {
      return res.status(404).json({ message: 'التقرير غير موجود' });
    }

    if (checkReport.rows[0].status === 'submitted') {
      return res.status(403).json({ 
        message: 'لا يمكن تعديل تقرير تم إرساله مسبقاً' 
      });
    }

    const result = await client.query(
      `UPDATE daily_reports 
       SET report_date = COALESCE($1, report_date),
           status = COALESCE($2, status)
       WHERE id = $3
       RETURNING *`,
      [report_date, status, reportId]
    );

    res.json({ 
      message: '✅ تم تحديث التقرير بنجاح', 
      report: result.rows[0] 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// إرسال تقرير (submitted)
router.put('/:reportId/submit', requireAuth, subAdminOnly, async (req, res) => {
  const { reportId } = req.params;

  try {
    const result = await client.query(
      `UPDATE daily_reports 
       SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'التقرير غير موجود أو تم إرساله مسبقاً' 
      });
    }

    res.json({ 
      message: '✅ تم إرسال التقرير بنجاح', 
      report: result.rows[0] 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف تقرير (المهندس فقط)
router.delete('/:reportId', requireAuth, subAdminOnly, async (req, res) => {
  const { reportId } = req.params;

  try {
    const checkReport = await client.query(
      'SELECT status FROM daily_reports WHERE id = $1',
      [reportId]
    );

    if (checkReport.rows.length === 0) {
      return res.status(404).json({ message: 'التقرير غير موجود' });
    }

    if (checkReport.rows[0].status === 'submitted') {
      return res.status(403).json({ 
        message: 'لا يمكن حذف تقرير تم إرساله مسبقاً' 
      });
    }

    await client.query(
      'DELETE FROM daily_reports WHERE id = $1',
      [reportId]
    );

    res.json({ message: '✅ تم حذف التقرير بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

console.log('✅ Daily reports routes loaded successfully');
console.log('  - /project/:projectId/today');
console.log('  - /project/:projectId/all');
console.log('  - /project/:projectId/latest');
console.log('  - /project/:projectId/latest-submitted');
console.log('  - /project/:projectId/submitted');

module.exports = router;
///Users/fatimahadeeb/Desktop/reports/src/routes/AdddailyReports.js