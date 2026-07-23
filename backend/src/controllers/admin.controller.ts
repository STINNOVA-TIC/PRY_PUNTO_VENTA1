// backend/src/controllers/admin.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

const TABLE_WHITELIST = [
  'departamento',
  'empresa',
  'sucursal',
  'centro_costos',
  'categoria',
  'proveedor',
  'producto',
  'rol',
  'modulo',
  'permiso'
];

export const adminController = {
  // Obtener todas las filas de una tabla
  read: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { table } = req.params;

      if (!TABLE_WHITELIST.includes(table)) {
        throw new AppError('Tabla no permitida para administración dinámica', 400);
      }

      const pkCol = `${table}_id`;
      const query = `SELECT * FROM ${table} ORDER BY ${pkCol} DESC`;
      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al leer datos administrativos', 500);
    }
  },

  // Insertar una fila de forma dinámica
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { table } = req.params;
      const data = req.body;

      if (!TABLE_WHITELIST.includes(table)) {
        throw new AppError('Tabla no permitida para administración dinámica', 400);
      }

      // Filtrar y validar llaves de la petición
      const keys = Object.keys(data).filter(key => /^[a-z0-9_]+$/.test(key));
      if (keys.length === 0) {
        throw new AppError('No hay columnas válidas para insertar', 400);
      }

      const columnsStr = keys.join(', ');
      const valuesPlaceholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const queryValues = keys.map(k => data[k]);

      const query = `INSERT INTO ${table} (${columnsStr}) VALUES (${valuesPlaceholders}) RETURNING *`;
      const result = await pool.query(query, queryValues);

      // Si es una venta o producto, emitir evento socket
      if (table === 'producto') {
        req.io?.emit('producto-actualizado', result.rows[0]);
      }

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Registro insertado exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear registro administrativo', 500);
    }
  },

  // Actualizar una fila de forma dinámica
  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { table, id } = req.params;
      const data = req.body;

      if (!TABLE_WHITELIST.includes(table)) {
        throw new AppError('Tabla no permitida para administración dinámica', 400);
      }

      const keys = Object.keys(data).filter(key => /^[a-z0-9_]+$/.test(key));
      if (keys.length === 0) {
        throw new AppError('No hay columnas válidas para actualizar', 400);
      }

      const pkCol = `${table}_id`;
      const sets = keys.map((k, idx) => `${k} = $${idx + 1}`).join(', ');
      const queryValues = keys.map(k => data[k]);
      queryValues.push(parseInt(id)); // ID al final

      const query = `UPDATE ${table} SET ${sets} WHERE ${pkCol} = $${queryValues.length} RETURNING *`;
      const result = await pool.query(query, queryValues);

      if (result.rows.length === 0) {
        throw new AppError('Registro no encontrado', 404);
      }

      if (table === 'producto') {
        req.io?.emit('producto-actualizado', result.rows[0]);
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Registro actualizado exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar registro administrativo', 500);
    }
  },

  // Desactivar / Cambiar estado de forma blanda (Soft delete)
  toggleStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { table, id } = req.params;
      const { activo } = req.body; // boolean

      if (!TABLE_WHITELIST.includes(table)) {
        throw new AppError('Tabla no permitida para administración dinámica', 400);
      }

      const pkCol = `${table}_id`;
      const statusCol = `${table}_estado`;
      const targetStatus = activo ? 'activo' : 'inactivo';

      // Si la tabla tiene campo de fecha de desactivación, registrarla
      let query = '';
      if (activo) {
        query = `UPDATE ${table} SET ${statusCol} = $1 WHERE ${pkCol} = $2 RETURNING *`;
      } else {
        // Buscar si existe columna de fecha de desactivación en metadata de Postgres
        const checkColRes = await pool.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = $1 AND column_name = $2`,
          [table, `${table}_fecha_desactivacion`]
        );
        if (checkColRes.rows.length > 0) {
          query = `UPDATE ${table} SET ${statusCol} = $1, ${table}_fecha_desactivacion = CURRENT_TIMESTAMP WHERE ${pkCol} = $2 RETURNING *`;
        } else {
          query = `UPDATE ${table} SET ${statusCol} = $1 WHERE ${pkCol} = $2 RETURNING *`;
        }
      }

      const result = await pool.query(query, [targetStatus, parseInt(id)]);

      if (result.rows.length === 0) {
        throw new AppError('Registro no encontrado', 404);
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: `Estado cambiado a ${targetStatus} exitosamente`
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al cambiar el estado del registro', 500);
    }
  }
};
