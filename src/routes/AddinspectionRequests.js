

const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, adminOnly } = require('../middlewares/authMiddleware');



//  توليد Report Code بشكل R-0001, R-0002 ...

const generateInspectionReportCode = async () => {
  try {
    const result = await client.query('SELECT COUNT(*) FROM inspection_requests');
    const count = parseInt(result.rows[0].count) + 1;
    const number = count.toString().padStart(4, '0'); // 0001, 0002, ...
    return `R-${number}`; // النتيجة: R-0001, R-0002, ...
  } catch (err) {
    console.error('Error generating report code:', err.message);
    return `R-0000`;
  }
};



//  إنشاء Inspection Request (Admin فقط)

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const {
    owner,
    request_date,
    site,
    site_engineer_name,
    item,
    inspection_location,
    contractor
  } = req.body;

  if (!owner || !request_date || !site) {
    return res.status(400).json({
      message: 'owner, request_date and site are required'
    });
  }

  try {
    const reportCode = await generateInspectionReportCode();

    const result = await client.query(
      `
      INSERT INTO inspection_requests
      (
        report_code,
        owner,
        request_date,
        site,
        site_engineer_name,
        item,
        inspection_location,
        contractor,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        reportCode,
        owner,
        request_date,
        site,
        site_engineer_name || null,
        item || null,
        inspection_location || null,
        contractor || null,
        req.user.id
      ]
    );

    res.status(201).json({
      message: 'Inspection request created successfully',
      inspectionRequest: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//  جلب كل Inspection Requests

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await client.query(
      'SELECT * FROM inspection_requests ORDER BY created_at DESC'
    );

    res.json({ inspectionRequests: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//  تعديل Inspection Request (Admin فقط)

router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { id } = req.params;

  const {
    owner,
    request_date,
    site,
    site_engineer_name,
    item,
    inspection_location,
    contractor
  } = req.body;

  try {
    const result = await client.query(
      `
      UPDATE inspection_requests
      SET
        owner = $1,
        request_date = $2,
        site = $3,
        site_engineer_name = $4,
        item = $5,
        inspection_location = $6,
        contractor = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        owner,
        request_date,
        site,
        site_engineer_name || null,
        item || null,
        inspection_location || null,
        contractor || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Inspection request not found'
      });
    }

    res.json({
      message: 'Inspection request updated successfully',
      inspectionRequest: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//  حذف Inspection Request (Admin فقط)

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM inspection_requests WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Inspection request not found'
      });
    }

    res.json({
      message: 'Inspection request deleted successfully'
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;