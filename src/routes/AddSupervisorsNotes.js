
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');

//  إضافة Supervisor Note (Engineer فقط)

router.post('/', requireAuth, subAdminOnly, async (req, res) => {
  const { inspection_request_id, notes, action_taken } = req.body;

  if (!inspection_request_id || !action_taken) {
    return res.status(400).json({
      message: 'inspection_request_id and action_taken are required'
    });
  }

  try {
    const result = await client.query(
      `
      INSERT INTO supervisors_notes
      (inspection_request_id, notes, action_taken, supervisor_id)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        inspection_request_id,
        notes || null,
        action_taken,
        req.user.id
      ]
    );

    res.status(201).json({
      message: 'Supervisor note added successfully',
      supervisorNote: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//  جلب Supervisor Notes حسب inspection_request_id

router.get('/:inspectionRequestId', requireAuth, async (req, res) => {
  const { inspectionRequestId } = req.params;

  try {
    const result = await client.query(
      `
      SELECT *
      FROM supervisors_notes
      WHERE inspection_request_id = $1
      ORDER BY created_at DESC
      `,
      [inspectionRequestId]
    );

    res.json({ supervisorNotes: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//  تعديل Supervisor Note (Engineer فقط)

router.put('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;
  const { notes, action_taken } = req.body;

  if (!action_taken) {
    return res.status(400).json({ message: 'action_taken is required' });
  }

  try {
    const result = await client.query(
      `
      UPDATE supervisors_notes
      SET
        notes = $1,
        action_taken = $2
      WHERE id = $3
      RETURNING *
      `,
      [notes || null, action_taken, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supervisor note not found' });
    }

    res.json({
      message: 'Supervisor note updated successfully',
      supervisorNote: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//  حذف Supervisor Note (Engineer فقط)

router.delete('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM supervisors_notes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supervisor note not found' });
    }

    res.json({ message: 'Supervisor note deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
///Users/fatimahadeeb/Desktop/Dit Projects/src/routes/AddSupervisorsNotes.js