

// routes/AddMaterials.js
const express = require('express');
const router = express.Router();
const client = require('../config/db');
const { requireAuth, subAdminOnly } = require('../middlewares/authMiddleware');



//  إضافة مادة (Engineer فقط)

router.post('/', requireAuth, subAdminOnly, async (req, res) => {
  const {
    report_id,
    material_name,
    material_type,
    quantity,
    storage_location,
    supplier_name,
    supplier_contact,
    supply_location
  } = req.body;

  if (!report_id || !material_name) {
    return res.status(400).json({ message: 'report_id and material_name are required' });
  }

  try {
    const result = await client.query(
      `
      INSERT INTO materials
      (report_id, material_name, material_type, quantity, storage_location, supplier_name, supplier_contact, supply_location)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        report_id,
        material_name,
        material_type || null,
        quantity || 0,
        storage_location || null,
        supplier_name || null,
        supplier_contact || null,
        supply_location || null
      ]
    );

    res.status(201).json({
      message: 'Material added successfully',
      material: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//  جلب المواد حسب report_id

router.get('/:reportId', requireAuth, async (req, res) => {
  const { reportId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM materials WHERE report_id = $1 ORDER BY id ASC',
      [reportId]
    );

    res.json({ materials: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//  تعديل مادة (Engineer فقط)

router.put('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  const {
    material_name,
    material_type,
    quantity,
    storage_location,
    supplier_name,
    supplier_contact,
    supply_location
  } = req.body;

  try {
    const result = await client.query(
      `
      UPDATE materials
      SET
        material_name = $1,
        material_type = $2,
        quantity = $3,
        storage_location = $4,
        supplier_name = $5,
        supplier_contact = $6,
        supply_location = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        material_name,
        material_type,
        quantity,
        storage_location,
        supplier_name,
        supplier_contact,
        supply_location,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.json({
      message: 'Material updated successfully',
      material: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// حذف مادة (Engineer فقط)

router.delete('/:id', requireAuth, subAdminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM materials WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.json({ message: 'Material deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
///Users/fatimahadeeb/Desktop/Dit Projects/src/routes/AddMaterials.js