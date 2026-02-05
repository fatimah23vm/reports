


const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');


//  إضافة توقيع (Engineer)

router.post('/:reportId', requireAuth, subAdminOnly, async (req, res) => {
  const { reportId } = req.params;
  const { signed_by, signature_data } = req.body;

  if (!signature_data) {
    return res.status(400).json({ message: 'Signature data is required' });
  }

  try {
    const result = await client.query(
      `INSERT INTO signatures (report_id, signed_by, signature_data)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reportId, signed_by || req.user.role, signature_data]
    );

    res.json({
      message: 'Signature added successfully',
      signature: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// جلب توقيع تقرير

router.get('/:reportId', requireAuth, async (req, res) => {
  const { reportId } = req.params;

  try {
    const result = await client.query(
      `SELECT * FROM signatures WHERE report_id = $1`,
      [reportId]
    );

    res.json({
      signatures: result.rows
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//  تعديل توقيع

router.put('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;
  const { signature_data } = req.body;

  try {
    const result = await client.query(
      `UPDATE signatures
       SET signature_data = $1, signed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [signature_data, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signature not found' });
    }

    res.json({
      message: 'Signature updated successfully',
      signature: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف توقيع

router.delete('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      `DELETE FROM signatures WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signature not found' });
    }

    res.json({ message: 'Signature deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
