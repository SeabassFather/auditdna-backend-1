// ═══════════════════════════════════════════════════════════════
// SII-MX BACKEND ROUTES - FIXED VERSION
// All CRUD operations for Mexican Real Estate ERP
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'auditdna',
  password: 'auditdna2026',
  port: 5432,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ SII-MX Database connection error:', err);
  } else {
    console.log('✅ SII-MX connected to PostgreSQL');
  }
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM sii_clientes WHERE activo = true) as total_clientes,
        (SELECT COUNT(*) FROM sii_fraccionamientos) as total_fraccionamientos,
        (SELECT COUNT(*) FROM sii_contratos WHERE estatus = 'vigente') as contratos_activos,
        (SELECT COALESCE(SUM(monto), 0) FROM sii_mensualidades 
         WHERE estatus = 'pagada' 
         AND EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE)
        ) as pagos_mes_actual,
        (SELECT COALESCE(SUM(monto), 0) FROM sii_mensualidades 
         WHERE estatus = 'vencida'
        ) as cartera_vencida,
        (SELECT COALESCE(SUM(monto), 0) FROM sii_mensualidades 
         WHERE estatus = 'pagada' 
         AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE)
        ) as ingresos_anuales
    `);

    res.json({
      totalClientes: parseInt(stats.rows[0].total_clientes) || 0,
      totalFraccionamientos: parseInt(stats.rows[0].total_fraccionamientos) || 0,
      contratosActivos: parseInt(stats.rows[0].contratos_activos) || 0,
      pagosMesActual: parseFloat(stats.rows[0].pagos_mes_actual) || 0,
      carteraVencida: parseFloat(stats.rows[0].cartera_vencida) || 0,
      ingresosAnuales: parseFloat(stats.rows[0].ingresos_anuales) || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CLIENTES (Customers)
// ═══════════════════════════════════════════════════════════════

router.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sii_clientes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.get('/clientes/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sii_clientes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

router.post('/clientes', async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, rfc, curp, fecha_nacimiento, telefono, email, direccion, ciudad, estado, codigo_postal, identificacion_oficial, estado_civil, ocupacion, activo } = req.body;

    const result = await pool.query(`
      INSERT INTO sii_clientes (
        nombre, apellido_paterno, apellido_materno, rfc, curp,
        fecha_nacimiento, telefono, email, direccion, ciudad,
        estado, codigo_postal, identificacion_oficial, estado_civil,
        ocupacion, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [nombre, apellido_paterno, apellido_materno, rfc, curp, fecha_nacimiento, telefono, email, direccion, ciudad, estado, codigo_postal, identificacion_oficial, estado_civil, ocupacion, activo !== false]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido_paterno, apellido_materno, rfc, curp, fecha_nacimiento, telefono, email, direccion, ciudad, estado, codigo_postal, identificacion_oficial, estado_civil, ocupacion, activo } = req.body;

    const result = await pool.query(`
      UPDATE sii_clientes SET
        nombre = $1, apellido_paterno = $2, apellido_materno = $3,
        rfc = $4, curp = $5, fecha_nacimiento = $6, telefono = $7,
        email = $8, direccion = $9, ciudad = $10, estado = $11,
        codigo_postal = $12, identificacion_oficial = $13,
        estado_civil = $14, ocupacion = $15, activo = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *
    `, [nombre, apellido_paterno, apellido_materno, rfc, curp, fecha_nacimiento, telefono, email, direccion, ciudad, estado, codigo_postal, identificacion_oficial, estado_civil, ocupacion, activo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/clientes/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sii_clientes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado', cliente: result.rows[0] });
  } catch (error) {
    console.error('Error deleting cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FRACCIONAMIENTOS (Developments)
// ═══════════════════════════════════════════════════════════════

router.get('/fraccionamientos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM sii_predios WHERE fraccionamiento_id = f.id) as total_lotes,
        (SELECT COUNT(*) FROM sii_predios WHERE fraccionamiento_id = f.id AND estatus = 'disponible') as lotes_disponibles,
        (SELECT COUNT(*) FROM sii_predios WHERE fraccionamiento_id = f.id AND estatus = 'vendido') as lotes_vendidos
      FROM sii_fraccionamientos f
      ORDER BY f.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fraccionamientos:', error);
    res.status(500).json({ error: 'Error al obtener fraccionamientos' });
  }
});

router.post('/fraccionamientos', async (req, res) => {
  try {
    const { nombre, ubicacion, descripcion, total_lotes, precio_m2, servicios } = req.body;

    const result = await pool.query(`
      INSERT INTO sii_fraccionamientos (nombre, ubicacion, descripcion, total_lotes, precio_m2, servicios)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [nombre, ubicacion, descripcion, total_lotes, precio_m2, servicios]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating fraccionamiento:', error);
    res.status(500).json({ error: 'Error al crear fraccionamiento' });
  }
});

router.put('/fraccionamientos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, descripcion, total_lotes, precio_m2, servicios } = req.body;

    const result = await pool.query(`
      UPDATE sii_fraccionamientos SET
        nombre = $1, ubicacion = $2, descripcion = $3,
        total_lotes = $4, precio_m2 = $5, servicios = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [nombre, ubicacion, descripcion, total_lotes, precio_m2, servicios, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fraccionamiento no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating fraccionamiento:', error);
    res.status(500).json({ error: 'Error al actualizar fraccionamiento' });
  }
});

router.delete('/fraccionamientos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sii_fraccionamientos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fraccionamiento no encontrado' });
    }
    res.json({ message: 'Fraccionamiento eliminado', fraccionamiento: result.rows[0] });
  } catch (error) {
    console.error('Error deleting fraccionamiento:', error);
    res.status(500).json({ error: 'Error al eliminar fraccionamiento' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CONTRATOS (Contracts)
// ═══════════════════════════════════════════════════════════════

router.get('/contratos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        cl.nombre || ' ' || cl.apellido_paterno as cliente_nombre,
        p.numero as predio_numero
      FROM sii_contratos c
      LEFT JOIN sii_clientes cl ON c.cliente_id = cl.id
      LEFT JOIN sii_predios p ON c.predio_id = p.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contratos:', error);
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

router.post('/contratos', async (req, res) => {
  try {
    const { cliente_id, predio_id, folio, fecha_firma, monto_total, enganche, saldo_financiar, numero_mensualidades, monto_mensualidad, tasa_interes, fecha_inicio_pagos, fecha_vencimiento, estatus } = req.body;

    const result = await pool.query(`
      INSERT INTO sii_contratos (
        cliente_id, predio_id, folio, fecha_firma, monto_total,
        enganche, saldo_financiar, numero_mensualidades, monto_mensualidad,
        tasa_interes, fecha_inicio_pagos, fecha_vencimiento, estatus
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [cliente_id, predio_id, folio, fecha_firma, monto_total, enganche, saldo_financiar, numero_mensualidades, monto_mensualidad, tasa_interes, fecha_inicio_pagos, fecha_vencimiento, estatus || 'vigente']);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contrato:', error);
    res.status(500).json({ error: 'Error al crear contrato' });
  }
});

router.delete('/contratos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sii_contratos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    res.json({ message: 'Contrato eliminado', contrato: result.rows[0] });
  } catch (error) {
    console.error('Error deleting contrato:', error);
    res.status(500).json({ error: 'Error al eliminar contrato' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MENSUALIDADES (Installments)
// ═══════════════════════════════════════════════════════════════

router.get('/mensualidades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        c.folio as contrato_folio,
        cl.nombre || ' ' || cl.apellido_paterno as cliente_nombre
      FROM sii_mensualidades m
      LEFT JOIN sii_contratos c ON m.contrato_id = c.id
      LEFT JOIN sii_clientes cl ON c.cliente_id = cl.id
      ORDER BY m.fecha_vencimiento ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mensualidades:', error);
    res.status(500).json({ error: 'Error al obtener mensualidades' });
  }
});

router.post('/mensualidades/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_pago, monto_pagado, metodo_pago, referencia } = req.body;

    const result = await pool.query(`
      UPDATE sii_mensualidades SET
        estatus = 'pagada',
        fecha_pago = $1,
        monto_pagado = $2,
        metodo_pago = $3,
        referencia = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [fecha_pago || new Date(), monto_pagado, metodo_pago, referencia, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensualidad no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking mensualidad as paid:', error);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SERVICIOS (Services)
// ═══════════════════════════════════════════════════════════════

router.get('/servicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sii_servicios ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = router;