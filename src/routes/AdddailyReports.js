

const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

// ========== للتصحيح - يتأكد أن الراوتر شغال ==========
console.log('✅ Loading daily reports routes...');

// ========== جلب جميع التقارير (للمدير) ==========
router.get('/all-reports', requireAuth, async (req, res) => {
  console.log('📋 Fetching all reports');
  try {
    const result = await client.query(
      `SELECT dr.*, 
              orr.report_number as project_report_number, 
              orr.owner_name, 
              orr.location, 
              orr.company_name,
              orr.engineer_name,
              orr.id as project_id
       FROM daily_reports dr
       JOIN owner_reports orr ON dr.project_id = orr.id
       ORDER BY dr.created_at DESC`
    );

    res.json({ reports: result.rows });
  } catch (err) {
    console.error('Error fetching all reports:', err);
    res.status(500).json({ message: err.message });
  }
});

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

// ✅ ========== جلب تقارير مهندس معين (للداشبورد) ==========
router.get('/engineer/:username/reports', requireAuth, async (req, res) => {
  console.log('📋 Fetching reports for engineer:', req.params.username);
  const { username } = req.params;

  try {
    const result = await client.query(
      `SELECT dr.*, 
              orr.report_number as project_report_number, 
              orr.owner_name, 
              orr.location, 
              orr.company_name,
              orr.id as project_id
       FROM daily_reports dr
       JOIN owner_reports orr ON dr.project_id = orr.id
       WHERE orr.engineer_name = $1
       ORDER BY dr.created_at DESC`,
      [username]
    );

    // تنسيق البيانات لتتناسب مع ما يتوقعه الفرونت إند
    const formattedReports = result.rows.map(report => ({
      id: report.id,
      project_id: report.project_id,
      report_date: report.report_date,
      report_number: report.report_number,
      status: report.status,
      created_at: report.created_at,
      submitted_at: report.submitted_at,
      created_by: report.created_by,
      project: {
        id: report.project_id,
        report_number: report.project_report_number,
        owner_name: report.owner_name,
        location: report.location,
        company_name: report.company_name
      }
    }));

    res.json({ reports: formattedReports });
  } catch (err) {
    console.error('Error fetching engineer reports:', err);
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

// ✅ ========== إنشاء تقرير جديد ==========
router.post('/project/:projectId', requireAuth, subAdminOnly, async (req, res) => {
  console.log('📝 Creating new daily report for project:', req.params.projectId);
  const { projectId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    // تحقق من وجود المشروع
    const project = await client.query(
      'SELECT report_number FROM owner_reports WHERE id = $1',
      [projectId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // تحقق إذا كان فيه تقرير لليوم موجود مسبقاً
    const existingReport = await client.query(
      `SELECT * FROM daily_reports 
       WHERE project_id = $1 AND report_date = $2`,
      [projectId, today]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({ 
        message: 'يوجد تقرير لهذا اليوم مسبقاً',
        report: existingReport.rows[0]
      });
    }

    // إنشاء رقم التقرير
    const projectNumber = project.rows[0].report_number;
    const reportNumber = `${projectNumber}-${today.replace(/-/g, '')}`;

    // إنشاء التقرير الجديد
    const newReport = await client.query(
      `INSERT INTO daily_reports 
       (project_id, report_date, report_number, created_by, status, created_at)
       VALUES ($1, $2, $3, $4, 'draft', CURRENT_TIMESTAMP)
       RETURNING *`,
      [projectId, today, reportNumber, req.user.username]
    );

    console.log('✅ Report created successfully:', newReport.rows[0].id);
    res.status(201).json({ 
      message: '✅ تم إنشاء التقرير بنجاح', 
      report: newReport.rows[0] 
    });

  } catch (err) {
    console.error('❌ Error creating report:', err);
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
console.log('  - /all-reports'); // <-- أضف هذا السطر
console.log('  - /project/:projectId/today');
console.log('  - /project/:projectId/all');
console.log('  - /project/:projectId/latest');
console.log('  - /project/:projectId/latest-submitted');
console.log('  - /project/:projectId/submitted');
console.log('  - /engineer/:username/reports');
console.log('  - POST /project/:projectId');
console.log('  - /:reportId (GET, PUT, DELETE)');
console.log('  - /:reportId/submit (PUT)');

module.exports = router;