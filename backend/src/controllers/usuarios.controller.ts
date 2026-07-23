// backend/src/controllers/usuarios.controller.ts
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const usuariosController = {
  // Obtener todos los operadores del sistema
  getAll: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const query = `
        SELECT u.usuario_id, u.usuario_nombre, u.usuario_email, u.usuario_estado, 
               u.empleado_id, e.empleado_nombre, e.empleado_apellido,
               r.rol_id, r.rol_nombre
        FROM usuario u
        LEFT JOIN empleado e ON u.empleado_id = e.empleado_id
        LEFT JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
        LEFT JOIN rol r ON ur.rol_id = r.rol_id
        ORDER BY u.usuario_nombre ASC
      `;
      const resUsers = await pool.query(query);

      const data = resUsers.rows.map(row => ({
        id: row.usuario_id,
        nombre: row.usuario_nombre,
        email: row.usuario_email,
        activo: row.usuario_estado === 'activo',
        empleado: row.empleado_id ? {
          id: row.empleado_id,
          nombre: `${row.empleado_nombre} ${row.empleado_apellido}`
        } : null,
        rol: row.rol_id ? {
          id: row.rol_id,
          nombre: row.rol_nombre
        } : null
      }));

      res.json({
        success: true,
        data
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener operadores', 500);
    }
  },

  // Obtener roles activos
  getRoles: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const resRoles = await pool.query(
        "SELECT rol_id as id, rol_nombre as nombre, rol_descripcion as descripcion FROM rol WHERE rol_estado = 'activo' ORDER BY rol_id ASC"
      );
      res.json({
        success: true,
        data: resRoles.rows
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener roles', 500);
    }
  },

  // Crear un operador
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const { nombre, email, password, rol_id, empleado_id, activo } = req.body;

      if (!nombre || !email || !password || !rol_id) {
        throw new AppError('Los campos nombre, email, contraseña y rol son requeridos', 400);
      }

      // Validar duplicados
      const dupRes = await client.query('SELECT usuario_id FROM usuario WHERE usuario_email = $1', [email.trim().toLowerCase()]);
      if (dupRes.rows.length > 0) {
        throw new AppError('Ya existe un usuario con este correo electrónico', 400);
      }

      await client.query('BEGIN');

      // Hash de la clave
      const hashedPassword = await bcrypt.hash(password, 10);

      const userRes = await client.query(
        `INSERT INTO usuario (empleado_id, usuario_nombre, usuario_email, usuario_password, usuario_estado)
         VALUES ($1, $2, $3, $4, $5) RETURNING usuario_id`,
        [
          empleado_id || null, 
          nombre.trim(), 
          email.trim().toLowerCase(), 
          hashedPassword, 
          activo !== false ? 'activo' : 'inactivo'
        ]
      );
      const userId = userRes.rows[0].usuario_id;

      // Vincular rol
      await client.query(
        `INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)`,
        [userId, rol_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: { id: userId },
        message: 'Usuario operador creado exitosamente'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear usuario operador', 500);
    } finally {
      client.release();
    }
  },

  // Editar un operador
  update: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const id = parseInt(req.params.id);
      const { nombre, email, password, rol_id, empleado_id, activo } = req.body;

      if (!nombre || !email || !rol_id) {
        throw new AppError('Los campos nombre, email y rol son requeridos', 400);
      }

      // Validar correo duplicado
      const dupRes = await client.query('SELECT usuario_id FROM usuario WHERE usuario_email = $1 AND usuario_id <> $2', [email.trim().toLowerCase(), id]);
      if (dupRes.rows.length > 0) {
        throw new AppError('Ya existe otro usuario con este correo electrónico', 400);
      }

      await client.query('BEGIN');

      // Si actualizó contraseña, hacer hash. Si no, dejar la actual
      let updateQuery = '';
      let queryParams = [];

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateQuery = `
          UPDATE usuario 
          SET empleado_id = $1, usuario_nombre = $2, usuario_email = $3, usuario_password = $4, usuario_estado = $5, usuario_fecha_modificacion = CURRENT_TIMESTAMP
          WHERE usuario_id = $6
          RETURNING *
        `;
        queryParams = [empleado_id || null, nombre.trim(), email.trim().toLowerCase(), hashedPassword, activo ? 'activo' : 'inactivo', id];
      } else {
        updateQuery = `
          UPDATE usuario 
          SET empleado_id = $1, usuario_nombre = $2, usuario_email = $3, usuario_estado = $4, usuario_fecha_modificacion = CURRENT_TIMESTAMP
          WHERE usuario_id = $5
          RETURNING *
        `;
        queryParams = [empleado_id || null, nombre.trim(), email.trim().toLowerCase(), activo ? 'activo' : 'inactivo', id];
      }

      const userRes = await client.query(updateQuery, queryParams);
      if (userRes.rows.length === 0) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Actualizar rol
      await client.query('DELETE FROM usuario_rol WHERE usuario_id = $1', [id]);
      await client.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)', [id, rol_id]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Usuario operador actualizado correctamente'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar operador', 500);
    } finally {
      client.release();
    }
  },

  // Eliminar un operador
  delete: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      const userRes = await pool.query('SELECT * FROM usuario WHERE usuario_id = $1', [id]);
      if (userRes.rows.length === 0) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Evitar que el admin se borre a sí mismo
      if (req.user?.id === id) {
        throw new AppError('No puedes eliminar tu propio usuario operador', 400);
      }

      try {
        await pool.query('DELETE FROM usuario WHERE usuario_id = $1', [id]);
        res.json({
          success: true,
          message: 'Operador eliminado físicamente de la base de datos'
        });
      } catch (err) {
        // Si hay dependencias (ventas registradas con su usuario_id), desactivarlo
        await pool.query("UPDATE usuario SET usuario_estado = 'inactivo', usuario_fecha_desactivacion = CURRENT_TIMESTAMP WHERE usuario_id = $1", [id]);
        res.json({
          success: true,
          message: 'Operador inactivado debido a que tiene transacciones asociadas'
        });
      }
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al eliminar operador', 500);
    }
  }
};
