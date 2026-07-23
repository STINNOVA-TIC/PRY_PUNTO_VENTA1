// backend/src/controllers/entregas.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const entregasController = {
  // Obtener todas las entregas
  getAll: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let query = `
        SELECT s.*, e.empleado_nombre, e.empleado_apellido, e.empleado_cedula, d.departamento_nombre, e.empleado_foto
        FROM solicitud_entrega s
        JOIN empleado e ON s.empleado_id = e.empleado_id
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
      `;
      const params: any[] = [];

      // Si es empleado normal, ver solo sus propias solicitudes
      if (req.user?.rol_id === 3) {
        let empId = req.empleado?.empleado_id;
        if (!empId) {
          const userRes = await pool.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
          empId = userRes.rows[0]?.empleado_id;
        }
        query += ' WHERE s.empleado_id = $1';
        params.push(empId || 0);
      }

      query += ' ORDER BY s.solicitud_entrega_fecha_solicitud DESC';
      const solRes = await pool.query(query, params);

      const items = [];
      for (const row of solRes.rows) {
        const detailsRes = await pool.query(
          `SELECT sd.*, p.producto_nombre, p.producto_codigo
           FROM solicitud_entrega_detalle sd
           JOIN producto p ON sd.producto_id = p.producto_id
           WHERE sd.solicitud_entrega_id = $1`,
          [row.solicitud_entrega_id]
        );

        // Buscar si tiene alguna devolución registrada
        const devRes = await pool.query(
          'SELECT devolucion_estado FROM devolucion WHERE solicitud_entrega_id = $1',
          [row.solicitud_entrega_id]
        );
        const devState = devRes.rows[0]?.devolucion_estado || null;

        items.push({
          id: row.solicitud_entrega_id,
          codigo_entrega: row.solicitud_entrega_codigo,
          estado: row.solicitud_entrega_estado,
          fecha_solicitud: row.solicitud_entrega_fecha_solicitud,
          fecha_entrega: row.solicitud_entrega_fecha_entrega,
          observaciones: row.solicitud_entrega_observacion,
          foto_entrega: row.solicitud_entrega_foto_entrega,
          empleado: {
            id: row.empleado_id,
            nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
            codigo: row.empleado_cedula,
            departamento: row.departamento_nombre || 'General',
            foto: row.empleado_foto
          },
          detalles: detailsRes.rows.map(d => ({
            id: d.solicitud_entrega_detalle_id,
            producto_id: d.producto_id,
            producto_nombre: d.producto_nombre,
            producto_codigo: d.producto_codigo,
            cantidad: d.solicitud_entrega_detalle_cantidad,
            precio_unitario: parseFloat(d.solicitud_entrega_detalle_precio_unitario)
          })),
          devolucion_estado: devState
        });
      }

      res.json({
        success: true,
        data: items
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener entregas', 500);
    }
  },

  // Obtener por ID o por Código de Retiro
  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      let query = `
        SELECT s.*, e.empleado_nombre, e.empleado_apellido, e.empleado_cedula, d.departamento_nombre, e.empleado_foto, e.empleado_cargo
        FROM solicitud_entrega s
        JOIN empleado e ON s.empleado_id = e.empleado_id
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
      `;
      const params: any[] = [];

      if (isNaN(parseInt(id))) {
        // Buscar por código de retiro
        query += ' WHERE s.solicitud_entrega_codigo = $1';
        params.push(id.trim());
      } else {
        // Buscar por ID
        query += ' WHERE s.solicitud_entrega_id = $1';
        params.push(parseInt(id));
      }

      const solRes = await pool.query(query, params);
      const row = solRes.rows[0];

      if (!row) {
        throw new AppError('Solicitud de entrega no encontrada', 404);
      }

      const detailsRes = await pool.query(
        `SELECT sd.*, p.producto_nombre, p.producto_codigo
         FROM solicitud_entrega_detalle sd
         JOIN producto p ON sd.producto_id = p.producto_id
         WHERE sd.solicitud_entrega_id = $1`,
        [row.solicitud_entrega_id]
      );

      // Buscar si existe alguna devolución asociada y su estado
      const devRes = await pool.query(
        'SELECT devolucion_estado, devolucion_motivo, devolucion_observacion_tthh FROM devolucion WHERE solicitud_entrega_id = $1',
        [row.solicitud_entrega_id]
      );
      const devInfo = devRes.rows[0] || null;

      res.json({
        success: true,
        data: {
          id: row.solicitud_entrega_id,
          codigo_entrega: row.solicitud_entrega_codigo,
          estado: row.solicitud_entrega_estado,
          fecha_solicitud: row.solicitud_entrega_fecha_solicitud,
          fecha_entrega: row.solicitud_entrega_fecha_entrega,
          observaciones: row.solicitud_entrega_observacion,
          foto_entrega: row.solicitud_entrega_foto_entrega,
          empleado: {
            id: row.empleado_id,
            nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
            codigo: row.empleado_cedula,
            departamento: row.departamento_nombre || 'General',
            cargo: row.empleado_cargo,
            foto: row.empleado_foto
          },
          detalles: detailsRes.rows.map(d => ({
            id: d.solicitud_entrega_detalle_id,
            producto_id: d.producto_id,
            producto_nombre: d.producto_nombre,
            producto_codigo: d.producto_codigo,
            cantidad: d.solicitud_entrega_detalle_cantidad,
            precio_unitario: parseFloat(d.solicitud_entrega_detalle_precio_unitario)
          })),
          devolucion: devInfo ? {
            estado: devInfo.devolucion_estado,
            motivo: devInfo.devolucion_motivo,
            observacion_tthh: devInfo.devolucion_observacion_tthh
          } : null
        }
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al obtener los detalles de la entrega', 500);
    }
  },

  // Obtener pendientes
  getPendientes: async (_req: AuthRequest, res: Response) => {
    try {
      const query = `
        SELECT s.*, e.empleado_nombre, e.empleado_apellido, e.empleado_cedula, d.departamento_nombre, e.empleado_foto
        FROM solicitud_entrega s
        JOIN empleado e ON s.empleado_id = e.empleado_id
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
        WHERE s.solicitud_entrega_estado = 'pendiente'
        ORDER BY s.solicitud_entrega_fecha_solicitud DESC
      `;
      const solRes = await pool.query(query);

      const items = [];
      for (const row of solRes.rows) {
        const detailsRes = await pool.query(
          `SELECT sd.*, p.producto_nombre, p.producto_codigo
           FROM solicitud_entrega_detalle sd
           JOIN producto p ON sd.producto_id = p.producto_id
           WHERE sd.solicitud_entrega_id = $1`,
          [row.solicitud_entrega_id]
        );

        // Buscar si tiene alguna devolución registrada
        const devRes = await pool.query(
          'SELECT devolucion_estado FROM devolucion WHERE solicitud_entrega_id = $1',
          [row.solicitud_entrega_id]
        );
        const devState = devRes.rows[0]?.devolucion_estado || null;

        items.push({
          id: row.solicitud_entrega_id,
          codigo_entrega: row.solicitud_entrega_codigo,
          estado: row.solicitud_entrega_estado,
          fecha_solicitud: row.solicitud_entrega_fecha_solicitud,
          observaciones: row.solicitud_entrega_observacion,
          empleado: {
            id: row.empleado_id,
            nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
            codigo: row.empleado_cedula,
            departamento: row.departamento_nombre || 'General',
            foto: row.empleado_foto
          },
          detalles: detailsRes.rows.map(d => ({
            id: d.solicitud_entrega_detalle_id,
            producto_id: d.producto_id,
            producto_nombre: d.producto_nombre,
            producto_codigo: d.producto_codigo,
            cantidad: d.solicitud_entrega_detalle_cantidad
          })),
          devolucion_estado: devState
        });
      }

      res.json({
        success: true,
        data: items
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener entregas pendientes', 500);
    }
  },

  // Confirmar entrega física en bodega
  confirmar: async (req: AuthRequest, res: Response) => {
    try {
      const { solicitud_id, metodo_verificacion, observaciones, foto_entrega } = req.body;

      if (!solicitud_id || !metodo_verificacion) {
        throw new AppError('Datos de confirmación incompletos', 400);
      }

      const solRes = await pool.query(
        'SELECT * FROM solicitud_entrega WHERE solicitud_entrega_id = $1',
        [solicitud_id]
      );
      const solicitud = solRes.rows[0];

      if (!solicitud) {
        throw new AppError('Solicitud de entrega no encontrada', 404);
      }

      if (solicitud.solicitud_entrega_estado !== 'pendiente') {
        throw new AppError('La solicitud ya fue procesada anteriormente', 400);
      }

      const usuarioEntregaId = req.user?.id && req.user.id !== 0 ? req.user.id : null;
      const foto = foto_entrega || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80';

      await pool.query(
        `UPDATE solicitud_entrega 
         SET solicitud_entrega_estado = 'entregado', 
             solicitud_entrega_fecha_entrega = CURRENT_TIMESTAMP, 
             solicitud_entrega_observacion = $1, 
             usuario_entrega_id = $2, 
             solicitud_entrega_foto_entrega = $3
         WHERE solicitud_entrega_id = $4`,
        [observaciones || 'Entrega completada físicamente', usuarioEntregaId, foto, solicitud_id]
      );

      // Si existía una solicitud de devolución/cancelación pendiente para esta entrega, se rechaza automáticamente.
      await pool.query(
        `UPDATE devolucion 
         SET devolucion_estado = 'rechazado', 
             devolucion_observacion_tthh = 'Rechazado automáticamente: El guardia confirmó la entrega física de la mercancía.'
         WHERE solicitud_entrega_id = $1 AND devolucion_estado = 'pendiente'`,
        [solicitud_id]
      );

      if (req.io) {
        req.io.emit('entrega-realizada', { solicitud_id });
        req.io.emit('devolucion-actualizada', { solicitud_id });
        console.log('📡 WebSocket: Emitido entrega-realizada y devolucion-actualizada para', solicitud_id);
      }

      res.json({
        success: true,
        message: 'Entrega confirmada y registrada en bodega correctamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al confirmar la entrega en bodega', 500);
    }
  },

  // Cancelar entrega (valida que la devolución esté aprobada por TTHH primero)
  cancelar: async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      const id = parseInt(req.params.id);
      const { motivo } = req.body;

      await client.query('BEGIN');

      // 1. Validar que la solicitud exista
      const solRes = await client.query('SELECT * FROM solicitud_entrega WHERE solicitud_entrega_id = $1', [id]);
      const solicitud = solRes.rows[0];

      if (!solicitud) {
        throw new AppError('Solicitud no encontrada', 404);
      }

      // 2. Validar que exista una devolución aprobada por Talento Humano para esta entrega
      const devRes = await client.query(
        "SELECT * FROM devolucion WHERE solicitud_entrega_id = $1 AND devolucion_estado = 'aprobado'",
        [id]
      );
      
      if (devRes.rows.length === 0) {
        throw new AppError('No se puede cancelar esta entrega. Primero debe esperar que Talento Humano apruebe la solicitud de devolución.', 400);
      }
      const devolucionId = devRes.rows[0].devolucion_id;

      // 3. Restaurar el stock físico únicamente de los productos devueltos
      const devDetailsRes = await client.query(
        'SELECT * FROM devolucion_detalle WHERE devolucion_id = $1',
        [devolucionId]
      );
      for (const d of devDetailsRes.rows) {
        await client.query(
          'UPDATE producto SET producto_stock = producto_stock + $1 WHERE producto_id = $2',
          [d.cantidad_devuelta, d.producto_id]
        );

        // Registrar movimiento_inventario de devolución
        const prodRes = await client.query('SELECT producto_stock FROM producto WHERE producto_id = $1', [d.producto_id]);
        const stockNuevo = prodRes.rows[0]?.producto_stock || 0;
        await client.query(
          `INSERT INTO movimiento_inventario (
            producto_id, sucursal_id, usuario_id, movimiento_inventario_tipo,
            movimiento_inventario_cantidad, movimiento_inventario_stock_anterior,
            movimiento_inventario_stock_nuevo, movimiento_inventario_observacion,
            solicitud_entrega_id
          ) VALUES ($1, $2, $3, 'devolucion_entrada', $4, $5, $6, $7, $8)`,
          [
            d.producto_id,
            solicitud.sucursal_id,
            req.user?.id && req.user.id !== 0 ? req.user.id : 1,
            d.cantidad_devuelta,
            stockNuevo - d.cantidad_devuelta,
            stockNuevo,
            `Devolución aprobada por TTHH`,
            id
          ]
        );
      }

      // 4. Calcular si es devolución total o parcial
      const originalDetailsCount = await client.query(
        'SELECT COALESCE(SUM(solicitud_entrega_detalle_cantidad), 0) as total FROM solicitud_entrega_detalle WHERE solicitud_entrega_id = $1',
        [id]
      );
      const returnedDetailsCount = await client.query(
        'SELECT COALESCE(SUM(cantidad_devuelta), 0) as total FROM devolucion_detalle WHERE devolucion_id = $1',
        [devolucionId]
      );
      
      const originalTotal = parseInt(originalDetailsCount.rows[0].total || '0');
      const returnedTotal = parseInt(returnedDetailsCount.rows[0].total || '0');

      const isTotalDevolucion = returnedTotal >= originalTotal;
      const nuevoEstadoEntrega = isTotalDevolucion ? 'cancelado' : 'entregado';
      const obsEntrega = isTotalDevolucion 
        ? (motivo || 'Devolución total aprobada por TTHH') 
        : `Devolución parcial aprobada por TTHH. Se devolvieron ${returnedTotal} de ${originalTotal} unidades.`;

      await client.query(
        `UPDATE solicitud_entrega 
         SET solicitud_entrega_estado = $1, 
             solicitud_entrega_observacion = $2 
         WHERE solicitud_entrega_id = $3`,
        [nuevoEstadoEntrega, obsEntrega, id]
      );

      // 5. Buscar la venta original para actualizar o anular
      const ventaQuery = await client.query(
        `SELECT venta_id FROM venta 
         WHERE empleado_id = $1 
           AND sucursal_id = $2 
           AND ABS(EXTRACT(EPOCH FROM (venta_fecha - $3))) < 5
           AND venta_estado = 'completada'
         LIMIT 1`,
        [solicitud.empleado_id, solicitud.sucursal_id, solicitud.solicitud_entrega_fecha_solicitud]
      );

      if (ventaQuery.rows.length > 0) {
        const ventaId = ventaQuery.rows[0].venta_id;

        if (isTotalDevolucion) {
          // Anular la venta por completo si se devolvió todo
          await client.query(
            `UPDATE venta 
             SET venta_estado = 'cancelada',
                 venta_observacion = 'Venta cancelada por devolución total ejecutada físicamente'
             WHERE venta_id = $1`,
            [ventaId]
          );
        } else {
          // Si es parcial, descontar unidades y recalcular totales
          for (const d of devDetailsRes.rows) {
            const vdRes = await client.query(
              `SELECT * FROM venta_detalle WHERE venta_id = $1 AND producto_id = $2`,
              [ventaId, d.producto_id]
            );
            if (vdRes.rows.length > 0) {
              const vd = vdRes.rows[0];
              const newQty = Math.max(0, vd.venta_detalle_cantidad - d.cantidad_devuelta);
              
              // El precio unitario de venta_detalle ya tiene el descuento del 10%
              const precioUnitarioConDescuento = parseFloat(vd.venta_detalle_precio_unitario);
              const newSubtotal = newQty * precioUnitarioConDescuento;

              await client.query(
                `UPDATE venta_detalle 
                 SET venta_detalle_cantidad = $1, 
                     venta_detalle_subtotal = $2 
                 WHERE venta_detalle_id = $3`,
                [newQty, newSubtotal, vd.venta_detalle_id]
              );
            }
          }

          // Recalcular total neto de la venta
          const sumRes = await client.query(
            `SELECT COALESCE(SUM(venta_detalle_subtotal), 0) as total FROM venta_detalle WHERE venta_id = $1`,
            [ventaId]
          );
          const newVentaTotal = parseFloat(sumRes.rows[0].total);

          await client.query(
            `UPDATE venta 
             SET venta_total = $1, 
                 venta_observacion = 'Venta modificada por devolución parcial aprobada' 
             WHERE venta_id = $2`,
            [newVentaTotal, ventaId]
          );
        }
      }

      // 6. Actualizar la devolución a estado 'ejecutado'
      await client.query(
        `UPDATE devolucion 
         SET devolucion_estado = 'ejecutado', 
             devolucion_fecha_ejecucion = CURRENT_TIMESTAMP 
         WHERE devolucion_id = $1`,
        [devolucionId]
      );

      await client.query('COMMIT');

      if (req.io) {
        req.io.emit('devolucion-actualizada', { id });
        req.io.emit('entrega-realizada', { id });
        console.log('📡 WebSocket: Emitido devolucion-actualizada y entrega-realizada para', id);
      }

      res.json({
        success: true,
        message: isTotalDevolucion 
          ? 'Entrega cancelada y stock restaurado en bodega exitosamente.'
          : 'Devolución parcial procesada, stock restaurado y descuento de nómina ajustado.'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al procesar la cancelación de la entrega', 500);
    } finally {
      client.release();
    }
  },

  // Marcar como No Entregado (el empleado nunca retiró su producto)
  marcarNoEntregado: async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      const id = parseInt(req.params.id);
      const { observaciones, foto_evidencia } = req.body;

      await client.query('BEGIN');

      const solRes = await client.query('SELECT * FROM solicitud_entrega WHERE solicitud_entrega_id = $1', [id]);
      const solicitud = solRes.rows[0];

      if (!solicitud) {
        throw new AppError('Solicitud no encontrada', 404);
      }

      if (solicitud.solicitud_entrega_estado !== 'pendiente') {
        throw new AppError('La solicitud ya fue procesada anteriormente', 400);
      }

      // 1. Restaurar stock físico de los productos y registrar movimientos
      const detailsRes = await client.query(
        'SELECT * FROM solicitud_entrega_detalle WHERE solicitud_entrega_id = $1',
        [id]
      );
      for (const d of detailsRes.rows) {
        await client.query(
          'UPDATE producto SET producto_stock = producto_stock + $1 WHERE producto_id = $2',
          [d.solicitud_entrega_detalle_cantidad, d.producto_id]
        );

        const prodRes = await client.query('SELECT producto_stock FROM producto WHERE producto_id = $1', [d.producto_id]);
        const stockNuevo = prodRes.rows[0]?.producto_stock || 0;
        await client.query(
          `INSERT INTO movimiento_inventario (
            producto_id, sucursal_id, usuario_id, movimiento_inventario_tipo,
            movimiento_inventario_cantidad, movimiento_inventario_stock_anterior,
            movimiento_inventario_stock_nuevo, movimiento_inventario_observacion,
            solicitud_entrega_id
          ) VALUES ($1, $2, $3, 'devolucion_entrada', $4, $5, $6, $7, $8)`,
          [
            d.producto_id,
            solicitud.sucursal_id,
            req.user?.id && req.user.id !== 0 ? req.user.id : 1,
            d.solicitud_entrega_detalle_cantidad,
            stockNuevo - d.solicitud_entrega_detalle_cantidad,
            stockNuevo,
            `No entregado (pedido no retirado por el empleado)`,
            id
          ]
        );
      }

      // 2. Cambiar estado a 'no_entregado' y guardar foto de evidencia
      await client.query(
        `UPDATE solicitud_entrega 
         SET solicitud_entrega_estado = 'no_entregado', 
             solicitud_entrega_observacion = $1,
             solicitud_entrega_foto_entrega = $2
         WHERE solicitud_entrega_id = $3`,
        [observaciones || 'No retirado por el empleado', foto_evidencia || null, id]
      );

      // 2.5. Anular la venta original para evitar el cobro por nómina en los reportes de TTHH
      await client.query(
        `UPDATE venta 
         SET venta_estado = 'cancelada',
             venta_observacion = 'Venta cancelada por marcarse como No Entregada en Bodega'
         WHERE empleado_id = $1 
           AND sucursal_id = $2 
           AND ABS(EXTRACT(EPOCH FROM (venta_fecha - $3))) < 5
           AND venta_estado = 'completada'`,
        [solicitud.empleado_id, solicitud.sucursal_id, solicitud.solicitud_entrega_fecha_solicitud]
      );

      // Si existía una solicitud de devolución/cancelación pendiente para esta entrega, se rechaza automáticamente.
      await client.query(
        `UPDATE devolucion 
         SET devolucion_estado = 'rechazado', 
             devolucion_observacion_tthh = 'Rechazado automáticamente: La entrega fue marcada como no entregada (no retirada) por el guardia.'
         WHERE solicitud_entrega_id = $1 AND devolucion_estado = 'pendiente'`,
        [id]
      );

      await client.query('COMMIT');

      if (req.io) {
        req.io.emit('entrega-realizada', { id });
        req.io.emit('devolucion-actualizada', { id });
        console.log('📡 WebSocket: Emitido entrega-realizada y devolucion-actualizada para', id);
      }

      res.json({
        success: true,
        message: 'Entrega marcada como no entregada y stock devuelto a bodega.'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al registrar no entregado', 500);
    } finally {
      client.release();
    }
  },

  reportarIncidente: async (_req: AuthRequest, res: Response) => {
    res.json({ success: true, message: 'Incidente registrado' });
  },

  getEstadisticas: async (_req: AuthRequest, res: Response) => {
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) filter (where solicitud_entrega_estado = 'pendiente') as pendientes,
        COUNT(*) filter (where solicitud_entrega_estado = 'entregado') as entregadas,
        COUNT(*) as total
      FROM solicitud_entrega
    `);
    res.json({ success: true, data: statsRes.rows[0] });
  }
};