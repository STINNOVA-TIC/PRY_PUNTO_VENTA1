import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const autoconsumoController = {
  // Obtener todos los autoconsumos
  getAll: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401);
      }

      let query = `
        SELECT a.*, 
               e.empleado_nombre, e.empleado_apellido, e.empleado_cedula,
               d.departamento_nombre, 
               cc.centro_costos_nombre, cc.centro_costos_codigo,
               u_ap.usuario_nombre as aprobador_nombre,
               u_ent.usuario_nombre as entrega_nombre
        FROM autoconsumo a
        JOIN empleado e ON a.empleado_id = e.empleado_id
        JOIN departamento d ON a.departamento_id = d.departamento_id
        JOIN centro_costos cc ON a.centro_costos_id = cc.centro_costos_id
        LEFT JOIN usuario u_ap ON a.usuario_aprobador_id = u_ap.usuario_id
        LEFT JOIN usuario u_ent ON a.usuario_entrega_id = u_ent.usuario_id
      `;
      const params: any[] = [];

      // Si es un empleado común y no tiene permisos de ver todo, filtrar solo sus autoconsumos
      const isGuardia = req.user.rol_id === 2;
      const isEmpleado = req.user.rol_id === 3;
      const isEmpleadoAutorizado = req.user.rol_id === 8;

      if ((isEmpleado || isEmpleadoAutorizado) && req.user.rol_id !== 1) {
        let empId = req.empleado?.empleado_id;
        if (!empId) {
          const userRes = await pool.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
          empId = userRes.rows[0]?.empleado_id;
        }
        query += ' WHERE a.empleado_id = $1';
        params.push(empId || 0);
      } else if (isGuardia) {
        // El guardia solo ve solicitudes aprobadas o entregadas para su entrega física
        query += " WHERE a.autoconsumo_estado IN ('aprobado', 'entregado')";
      }

      query += ' ORDER BY a.autoconsumo_fecha_creacion DESC';
      const result = await pool.query(query, params);

      const list = [];
      for (const row of result.rows) {
        const detailsRes = await pool.query(
          `SELECT ad.*, p.producto_nombre, p.producto_codigo
           FROM autoconsumo_detalle ad
           JOIN producto p ON ad.producto_id = p.producto_id
           WHERE ad.autoconsumo_id = $1`,
          [row.autoconsumo_id]
        );

        list.push({
          id: row.autoconsumo_id,
          codigo: row.autoconsumo_codigo,
          justificacion: row.autoconsumo_justificacion,
          estado: row.autoconsumo_estado,
          fecha_solicitud: row.autoconsumo_fecha_solicitud,
          fecha_entrega: row.autoconsumo_fecha_entrega,
          fecha_aprobacion: row.autoconsumo_fecha_aprobacion,
          observacion: row.autoconsumo_observacion,
          foto_entrega: row.autoconsumo_foto_entrega,
          aprobador: row.aprobador_nombre,
          despachador: row.entrega_nombre,
          empleado: {
            id: row.empleado_id,
            nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
            cedula: row.empleado_cedula
          },
          departamento: {
            id: row.departamento_id,
            nombre: row.departamento_nombre
          },
          centro_costos: {
            id: row.centro_costos_id,
            nombre: row.centro_costos_nombre,
            codigo: row.centro_costos_codigo
          },
          detalles: detailsRes.rows.map(d => ({
            id: d.autoconsumo_detalle_id,
            producto_id: d.producto_id,
            producto_nombre: d.producto_nombre,
            producto_codigo: d.producto_codigo,
            cantidad: d.autoconsumo_detalle_cantidad,
            precio_unitario: parseFloat(d.autoconsumo_detalle_precio_unitario),
            subtotal: parseFloat(d.autoconsumo_detalle_subtotal)
          }))
        });
      }

      res.json({ success: true, data: list });
    } catch (error) {
      throw new AppError('Error al obtener los autoconsumos', 500);
    }
  },

  // Obtener detalle de autoconsumo por ID o Código
  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      let query = `
        SELECT a.*, 
               e.empleado_nombre, e.empleado_apellido, e.empleado_cedula,
               d.departamento_nombre, 
               cc.centro_costos_nombre, cc.centro_costos_codigo,
               u_ap.usuario_nombre as aprobador_nombre,
               u_ent.usuario_nombre as entrega_nombre
        FROM autoconsumo a
        JOIN empleado e ON a.empleado_id = e.empleado_id
        JOIN departamento d ON a.departamento_id = d.departamento_id
        JOIN centro_costos cc ON a.centro_costos_id = cc.centro_costos_id
        LEFT JOIN usuario u_ap ON a.usuario_aprobador_id = u_ap.usuario_id
        LEFT JOIN usuario u_ent ON a.usuario_entrega_id = u_ent.usuario_id
      `;
      const params: any[] = [];

      if (isNaN(parseInt(id))) {
        query += ' WHERE a.autoconsumo_codigo = $1';
        params.push(id.trim());
      } else {
        query += ' WHERE a.autoconsumo_id = $1';
        params.push(parseInt(id));
      }

      const result = await pool.query(query, params);
      const row = result.rows[0];

      if (!row) {
        throw new AppError('Autoconsumo no encontrado', 404);
      }

      const detailsRes = await pool.query(
        `SELECT ad.*, p.producto_nombre, p.producto_codigo
         FROM autoconsumo_detalle ad
         JOIN producto p ON ad.producto_id = p.producto_id
         WHERE ad.autoconsumo_id = $1`,
        [row.autoconsumo_id]
      );

      res.json({
        success: true,
        data: {
          id: row.autoconsumo_id,
          codigo: row.autoconsumo_codigo,
          justificacion: row.autoconsumo_justificacion,
          estado: row.autoconsumo_estado,
          fecha_solicitud: row.autoconsumo_fecha_solicitud,
          fecha_entrega: row.autoconsumo_fecha_entrega,
          fecha_aprobacion: row.autoconsumo_fecha_aprobacion,
          observacion: row.autoconsumo_observacion,
          foto_entrega: row.autoconsumo_foto_entrega,
          aprobador: row.aprobador_nombre,
          despachador: row.entrega_nombre,
          empleado: {
            id: row.empleado_id,
            nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
            cedula: row.empleado_cedula
          },
          departamento: {
            id: row.departamento_id,
            nombre: row.departamento_nombre
          },
          centro_costos: {
            id: row.centro_costos_id,
            nombre: row.centro_costos_nombre,
            codigo: row.centro_costos_codigo
          },
          detalles: detailsRes.rows.map(d => ({
            id: d.autoconsumo_detalle_id,
            producto_id: d.producto_id,
            producto_nombre: d.producto_nombre,
            producto_codigo: d.producto_codigo,
            cantidad: d.autoconsumo_detalle_cantidad,
            precio_unitario: parseFloat(d.autoconsumo_detalle_precio_unitario),
            subtotal: parseFloat(d.autoconsumo_detalle_subtotal)
          }))
        }
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al obtener detalle de autoconsumo', 500);
    }
  },

  // Crear una nueva solicitud de autoconsumo
  crear: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const { empleado_id, departamento_id, centro_costos_id, justificacion, productos } = req.body;

      if (!empleado_id || !departamento_id || !justificacion || !productos || !productos.length) {
        throw new AppError('Datos de autoconsumo incompletos', 400);
      }

      await client.query('BEGIN');

      // Obtener el centro_costos_id del departamento si no se envía
      const deptRes = await client.query(
        'SELECT centro_costos_id FROM departamento WHERE departamento_id = $1',
        [departamento_id]
      );
      const resolvedCCId = centro_costos_id || deptRes.rows[0]?.centro_costos_id;
      if (!resolvedCCId) {
        throw new AppError('El departamento seleccionado no tiene un centro de costos asociado', 400);
      }

      // 1. Obtener sucursal activa
      const sucRes = await client.query("SELECT sucursal_id FROM sucursal WHERE sucursal_estado = 'activo' LIMIT 1");
      const sucursalId = sucRes.rows[0]?.sucursal_id;
      if (!sucursalId) {
        throw new AppError('No hay sucursales activas configuradas', 500);
      }

      const calculatedDetails: any[] = [];

      // 2. Validar stock
      for (const p of productos) {
        const prodRes = await client.query('SELECT * FROM producto WHERE producto_id = $1', [p.producto_id]);
        const producto = prodRes.rows[0];
        if (!producto) {
          throw new AppError(`Producto con ID ${p.producto_id} no encontrado`, 404);
        }
        if (producto.producto_stock < p.cantidad) {
          throw new AppError(`Stock insuficiente para: ${producto.producto_nombre}`, 400);
        }

        const subtotal = parseFloat(producto.producto_precio) * p.cantidad;

        calculatedDetails.push({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_unitario: parseFloat(producto.producto_precio),
          subtotal: subtotal
        });
      }

      // 3. Generar código de autoconsumo único
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(100 + Math.random() * 900);
      const autoconsumoCodigo = `AUTO-${dateStr}-${rand}`;

      // 4. Crear registro de autoconsumo
      const autoconsumoRes = await client.query(
        `INSERT INTO autoconsumo (empleado_id, sucursal_id, departamento_id, centro_costos_id, autoconsumo_codigo, autoconsumo_justificacion, autoconsumo_estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
         RETURNING autoconsumo_id`,
        [empleado_id, sucursalId, departamento_id, resolvedCCId, autoconsumoCodigo, justificacion]
      );
      const autoconsumoId = autoconsumoRes.rows[0].autoconsumo_id;

      // 5. Crear detalles
      for (const d of calculatedDetails) {
        await client.query(
          `INSERT INTO autoconsumo_detalle (autoconsumo_id, producto_id, autoconsumo_detalle_cantidad, autoconsumo_detalle_precio_unitario, autoconsumo_detalle_subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [autoconsumoId, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal]
        );
      }

      await client.query('COMMIT');

      if (req.io) {
        req.io.emit('autoconsumo-pendiente', { id: autoconsumoId, codigo: autoconsumoCodigo });
      }

      res.status(201).json({
        success: true,
        data: {
          id: autoconsumoId,
          codigo: autoconsumoCodigo
        },
        message: 'Solicitud de autoconsumo registrada exitosamente'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear autoconsumo', 500);
    } finally {
      client.release();
    }
  },

  // Aprobar solicitud de autoconsumo (TTHH / ADMIN)
  aprobar: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { observacion } = req.body;
      const aprobadorId = req.user?.id && req.user.id !== 0 ? req.user.id : null;

      const autoRes = await pool.query('SELECT * FROM autoconsumo WHERE autoconsumo_id = $1', [id]);
      const autoconsumo = autoRes.rows[0];

      if (!autoconsumo) {
        throw new AppError('Solicitud de autoconsumo no encontrada', 404);
      }

      if (autoconsumo.autoconsumo_estado !== 'pendiente') {
        throw new AppError('La solicitud ya no está en estado pendiente', 400);
      }

      await pool.query(
        `UPDATE autoconsumo 
         SET autoconsumo_estado = 'aprobado',
             usuario_aprobador_id = $1,
             autoconsumo_fecha_aprobacion = CURRENT_TIMESTAMP,
             autoconsumo_observacion = COALESCE($2, autoconsumo_observacion)
         WHERE autoconsumo_id = $3`,
        [aprobadorId, observacion || 'Aprobada por Talento Humano', id]
      );

      if (req.io) {
        req.io.emit('autoconsumo-actualizado', { id, estado: 'aprobado' });
      }

      res.json({ success: true, message: 'Solicitud de autoconsumo aprobada con éxito' });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al aprobar autoconsumo', 500);
    }
  },

  // Cancelar o rechazar solicitud de autoconsumo
  cancelar: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { observacion, esRechazo } = req.body; // esRechazo = true si viene de TTHH rechazando

      const autoRes = await pool.query('SELECT * FROM autoconsumo WHERE autoconsumo_id = $1', [id]);
      const autoconsumo = autoRes.rows[0];

      if (!autoconsumo) {
        throw new AppError('Solicitud de autoconsumo no encontrada', 404);
      }

      if (autoconsumo.autoconsumo_estado === 'entregado') {
        throw new AppError('No se puede cancelar una solicitud que ya ha sido entregada', 400);
      }

      const nuevoEstado = esRechazo ? 'rechazado' : 'cancelado';

      await pool.query(
        `UPDATE autoconsumo 
         SET autoconsumo_estado = $1,
             autoconsumo_observacion = COALESCE($2, $3)
         WHERE autoconsumo_id = $4`,
        [nuevoEstado, observacion, esRechazo ? 'Rechazado por Talento Humano' : 'Cancelado por el solicitante', id]
      );

      if (req.io) {
        req.io.emit('autoconsumo-actualizado', { id, estado: nuevoEstado });
      }

      res.json({ success: true, message: `Solicitud de autoconsumo ${nuevoEstado} con éxito` });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al cancelar autoconsumo', 500);
    }
  },

  // Despachar / Entregar mercadería de autoconsumo (GUARDIA / ADMIN)
  entregar: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { observacion, foto_entrega } = req.body;
      const despachadorId = req.user?.id && req.user.id !== 0 ? req.user.id : null;

      await client.query('BEGIN');

      // 1. Obtener la solicitud
      const autoRes = await client.query('SELECT * FROM autoconsumo WHERE autoconsumo_id = $1 FOR UPDATE', [id]);
      const autoconsumo = autoRes.rows[0];

      if (!autoconsumo) {
        throw new AppError('Solicitud de autoconsumo no encontrada', 404);
      }

      if (autoconsumo.autoconsumo_estado !== 'aprobado') {
        throw new AppError('La solicitud debe estar aprobada para poder ser entregada', 400);
      }

      // 2. Obtener detalles y validar stock actual
      const detailsRes = await client.query('SELECT * FROM autoconsumo_detalle WHERE autoconsumo_id = $1', [id]);
      
      for (const d of detailsRes.rows) {
        const prodRes = await client.query('SELECT producto_stock, producto_nombre FROM producto WHERE producto_id = $1 FOR UPDATE', [d.producto_id]);
        const prod = prodRes.rows[0];
        if (prod.producto_stock < d.autoconsumo_detalle_cantidad) {
          throw new AppError(`Stock insuficiente de: ${prod.producto_nombre}. Stock actual: ${prod.producto_stock}, solicitado: ${d.autoconsumo_detalle_cantidad}`, 400);
        }
      }

      // 3. Modificar stock y crear movimiento de inventario para cada producto
      const stockUpdates = [];
      for (const d of detailsRes.rows) {
        // Descontar
        await client.query(
          'UPDATE producto SET producto_stock = producto_stock - $1 WHERE producto_id = $2',
          [d.autoconsumo_detalle_cantidad, d.producto_id]
        );

        // Obtener stock actual post-descuento
        const freshProdRes = await client.query('SELECT producto_stock FROM producto WHERE producto_id = $1', [d.producto_id]);
        const stockNuevo = freshProdRes.rows[0]?.producto_stock || 0;

        // Registrar movimiento
        await client.query(
          `INSERT INTO movimiento_inventario (
            producto_id, sucursal_id, usuario_id, movimiento_inventario_tipo,
            movimiento_inventario_cantidad, movimiento_inventario_stock_anterior,
            movimiento_inventario_stock_nuevo, movimiento_inventario_observacion
          ) VALUES ($1, $2, $3, 'salida', $4, $5, $6, $7)`,
          [
            d.producto_id,
            autoconsumo.sucursal_id,
            despachadorId || 1, // Si es virtual, asociar a admin por defecto
            d.autoconsumo_detalle_cantidad,
            stockNuevo + d.autoconsumo_detalle_cantidad,
            stockNuevo,
            `Autoconsumo despachado: ${autoconsumo.autoconsumo_codigo}`
          ]
        );

        stockUpdates.push({
          producto_id: d.producto_id,
          cantidad: d.autoconsumo_detalle_cantidad
        });
      }

      // 4. Actualizar estado de autoconsumo
      const foto = foto_entrega || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80';
      await client.query(
        `UPDATE autoconsumo 
         SET autoconsumo_estado = 'entregado',
             usuario_entrega_id = $1,
             autoconsumo_fecha_entrega = CURRENT_TIMESTAMP,
             autoconsumo_foto_entrega = $2,
             autoconsumo_observacion = COALESCE($3, autoconsumo_observacion)
         WHERE autoconsumo_id = $4`,
        [despachadorId, foto, observacion || 'Entrega de autoconsumo realizada físicamente', id]
      );

      await client.query('COMMIT');

      if (req.io) {
        req.io.emit('autoconsumo-actualizado', { id, estado: 'entregado' });
        req.io.emit('stock-actualizado', { productos: stockUpdates });
      }

      res.json({ success: true, message: 'Productos entregados y registrados exitosamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al despachar autoconsumo', 500);
    } finally {
      client.release();
    }
  }
};
