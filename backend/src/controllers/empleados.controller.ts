// backend/src/controllers/empleados.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { isValidEmail, isValidCedulaEcuatoriana } from '../utils/validators';

export const empleadosController = {
  // Catálogo mínimo para responsables de requerimientos de compra.
  // No expone cédula, correo, firma, fotografía ni permisos del colaborador.
  getCatalogoCompras: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `WITH permisos_efectivos AS (
           SELECT DISTINCT u.empleado_id, p.permiso_clave
           FROM usuario u
           JOIN usuario_rol ur ON ur.usuario_id = u.usuario_id
           JOIN rol_permiso rp ON rp.rol_id = ur.rol_id
           JOIN permiso p ON p.permiso_id = rp.permiso_id AND p.permiso_estado = 'activo'
           WHERE u.usuario_estado = 'activo'
             AND u.empleado_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM usuario_permiso up
               WHERE up.usuario_id = u.usuario_id
                 AND up.permiso_id = p.permiso_id
                 AND up.tipo = 'denegar'
             )
           UNION
           SELECT DISTINCT u.empleado_id, p.permiso_clave
           FROM usuario u
           JOIN usuario_permiso up ON up.usuario_id = u.usuario_id AND up.tipo = 'conceder'
           JOIN permiso p ON p.permiso_id = up.permiso_id AND p.permiso_estado = 'activo'
           WHERE u.usuario_estado = 'activo' AND u.empleado_id IS NOT NULL
         )
         SELECT e.empleado_id AS id,
                e.empleado_nombre AS nombre,
                e.empleado_apellido AS apellido,
                e.departamento_id,
                COALESCE(d.departamento_nombre, 'Sin Departamento') AS departamento,
                e.centro_costos_id,
                COALESCE(cc.centro_costos_nombre, 'Sin Centro de Costos') AS centro_costos,
                COALESCE(e.empleado_cargo, 'Empleado') AS cargo,
                bool_or(pe.permiso_clave IN ('compras.requerimientos.aprobar', 'requerimientos.firmar')) AS puede_aprobar,
                bool_or(pe.permiso_clave IN ('compras.requerimientos.recibir', 'requerimientos.firmar')) AS puede_recibir
         FROM empleado e
         JOIN permisos_efectivos pe ON pe.empleado_id = e.empleado_id
         LEFT JOIN departamento d ON d.departamento_id = e.departamento_id
         LEFT JOIN centro_costos cc ON cc.centro_costos_id = e.centro_costos_id
         WHERE e.empleado_estado = 'activo'
           AND pe.permiso_clave IN (
             'compras.requerimientos.aprobar',
             'compras.requerimientos.recibir',
             'requerimientos.firmar'
           )
         GROUP BY e.empleado_id, e.empleado_nombre, e.empleado_apellido,
                  e.departamento_id, d.departamento_nombre,
                  e.centro_costos_id, cc.centro_costos_nombre, e.empleado_cargo
         ORDER BY e.empleado_nombre ASC, e.empleado_apellido ASC`
      );

      res.json({ success: true, data: result.rows });
      return;
    } catch (_error) {
      throw new AppError('Error al obtener responsables de compras', 500);
    }
  },

  // Obtener todos los empleados
  getAll: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let query = `
        SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre,
               EXISTS (
                 SELECT 1 FROM usuario u 
                 JOIN usuario_permiso up ON u.usuario_id = up.usuario_id 
                 JOIN permiso p ON up.permiso_id = p.permiso_id
                 WHERE u.empleado_id = e.empleado_id AND p.permiso_clave = 'autoconsumo.crear' AND up.tipo = 'conceder' AND u.usuario_estado = 'activo'
               ) as permitir_autoconsumo,
               EXISTS (
                 SELECT 1 FROM usuario u 
                 JOIN usuario_permiso up ON u.usuario_id = up.usuario_id 
                 JOIN permiso p ON up.permiso_id = p.permiso_id
                 WHERE u.empleado_id = e.empleado_id AND p.permiso_clave = 'requerimientos.firmar' AND up.tipo = 'conceder' AND u.usuario_estado = 'activo'
               ) as permitir_firmas
        FROM empleado e
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
        LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
      `;
      const params: any[] = [];

      // Si es rol empleado, solo puede verse a sí mismo
      if (req.user?.rol_id === 3) {
        let empId = req.empleado?.empleado_id;
        if (!empId) {
          const userRes = await pool.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
          empId = userRes.rows[0]?.empleado_id;
        }
        query += ' WHERE e.empleado_id = $1';
        params.push(empId || 0);
      }

      query += ' ORDER BY e.empleado_nombre ASC, e.empleado_apellido ASC';
      const employeesRes = await pool.query(query, params);

      // Mapear los datos de los empleados
      const employees = employeesRes.rows.map(row => ({
        id: row.empleado_id,
        codigo_empleado: row.empleado_cedula,
        nombre: row.empleado_nombre,
        apellido: row.empleado_apellido,
        departamento_id: row.departamento_id,
        departamento: row.departamento_nombre || 'Sin Departamento',
        centro_costos_id: row.centro_costos_id,
        centro_costos: row.centro_costos_nombre || 'Sin Centro de Costos',
        cargo: row.empleado_cargo || 'Empleado',
        email: row.empleado_email || '',
        foto_perfil: row.empleado_foto || `https://ui-avatars.com/api/?name=${row.empleado_nombre}+${row.empleado_apellido}&size=128`,
        firma: row.empleado_firma || null,
        activo: row.empleado_estado === 'activo',
        permitir_autoconsumo: row.permitir_autoconsumo || false,
        permitir_firmas: row.permitir_firmas || false
      }));

      res.json({
        success: true,
        data: employees
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener empleados', 500);
    }
  },

  // Obtener un empleado por ID
  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      const empRes = await pool.query(
        `SELECT e.*, d.departamento_nombre,
                EXISTS (
                  SELECT 1 FROM usuario u 
                  JOIN usuario_permiso up ON u.usuario_id = up.usuario_id 
                  JOIN permiso p ON up.permiso_id = p.permiso_id
                  WHERE u.empleado_id = e.empleado_id AND p.permiso_clave = 'autoconsumo.crear' AND up.tipo = 'conceder' AND u.usuario_estado = 'activo'
                ) as permitir_autoconsumo,
                EXISTS (
                  SELECT 1 FROM usuario u 
                  JOIN usuario_permiso up ON u.usuario_id = up.usuario_id 
                  JOIN permiso p ON up.permiso_id = p.permiso_id
                  WHERE u.empleado_id = e.empleado_id AND p.permiso_clave = 'requerimientos.firmar' AND up.tipo = 'conceder' AND u.usuario_estado = 'activo'
                ) as permitir_firmas
         FROM empleado e 
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
         WHERE e.empleado_id = $1`,
        [id]
      );
      const empleado = empRes.rows[0];

      if (!empleado) {
        res.status(404).json({
          success: false,
          message: 'Empleado no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: empleado.empleado_id,
          codigo_empleado: empleado.empleado_cedula,
          nombre: empleado.empleado_nombre,
          apellido: empleado.empleado_apellido,
          departamento_id: empleado.departamento_id,
          departamento: empleado.departamento_nombre || 'Sin Departamento',
          centro_costos_id: empleado.centro_costos_id,
          cargo: empleado.empleado_cargo || 'Empleado',
          email: empleado.empleado_email || '',
          foto_perfil: empleado.empleado_foto || `https://ui-avatars.com/api/?name=${empleado.empleado_nombre}+${empleado.empleado_apellido}&size=128`,
          firma: empleado.empleado_firma || null,
          activo: empleado.empleado_estado === 'activo',
          permitir_autoconsumo: empleado.permitir_autoconsumo || false,
          permitir_firmas: empleado.permitir_firmas || false
        }
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener empleado', 500);
    }
  },

  // Obtener historial de compras de un empleado
  getHistorialCompras: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      const empRes = await pool.query('SELECT * FROM empleado WHERE empleado_id = $1', [id]);
      const empleado = empRes.rows[0];

      if (!empleado) {
        res.status(404).json({
          success: false,
          message: 'Empleado no encontrado'
        });
        return;
      }

      // Consultar historial real
      const ventasRes = await pool.query(
        `SELECT venta_id as id, venta_fecha as fecha, venta_total as total, 
                venta_estado as estado
         FROM venta 
         WHERE empleado_id = $1 
         ORDER BY venta_fecha DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          empleado: {
            id: empleado.empleado_id,
            nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
            codigo: empleado.empleado_cedula
          },
          historial: ventasRes.rows.map(v => ({
            id: v.id,
            fecha: v.fecha,
            total: parseFloat(v.total),
            estado: v.estado,
            metodo: 'nomina'
          }))
        }
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener historial de compras', 500);
    }
  },

  create: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { cedula, nombre, apellido, departamento_id, centro_costos_id, email, cargo, foto_perfil, firma, activo, permitir_autoconsumo, permitir_firmas } = req.body;

      if (!cedula || !nombre || !apellido) {
        throw new AppError('Cédula, nombre y apellido son requeridos', 400);
      }

      if (!isValidCedulaEcuatoriana(cedula)) {
        throw new AppError('El número de cédula ingresado no es válido para Ecuador', 400);
      }

      if (email && !isValidEmail(email)) {
        throw new AppError('Formato de correo electrónico inválido', 400);
      }

      const dupRes = await client.query('SELECT empleado_id FROM empleado WHERE empleado_cedula = $1', [cedula.trim()]);
      if (dupRes.rows.length > 0) {
        throw new AppError('Ya existe un empleado con esa cédula', 400);
      }

      const insertRes = await client.query(
        `INSERT INTO empleado (empleado_cedula, empleado_nombre, empleado_apellido, departamento_id, centro_costos_id, empleado_email, empleado_cargo, empleado_foto, empleado_firma, empleado_estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          cedula.trim(), 
          nombre.trim(), 
          apellido.trim(), 
          departamento_id || null, 
          centro_costos_id || null, 
          email ? email.trim() : null, 
          cargo ? cargo.trim() : null, 
          foto_perfil || null, 
          firma || null,
          activo !== false ? 'activo' : 'inactivo'
        ]
      );

      const empleado = insertRes.rows[0];

      if (permitir_autoconsumo || permitir_firmas) {
        const usuarioEmail = empleado.empleado_email || `colaborador_${empleado.empleado_cedula}@empresa.local`;
        const existingUserRes = await client.query(
          `SELECT usuario_id, empleado_id FROM usuario WHERE lower(usuario_email) = lower($1) FOR UPDATE`,
          [usuarioEmail]
        );

        let userId: number;
        if (existingUserRes.rows.length > 0) {
          const existingUser = existingUserRes.rows[0];
          if (existingUser.empleado_id && existingUser.empleado_id !== empleado.empleado_id) {
            throw new AppError('El correo ya está vinculado a otro colaborador', 400);
          }
          userId = existingUser.usuario_id;
          await client.query(
            `UPDATE usuario SET empleado_id = $1, usuario_fecha_modificacion = CURRENT_TIMESTAMP WHERE usuario_id = $2`,
            [empleado.empleado_id, userId]
          );
        } else {
          const userRes = await client.query(
            `INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado)
             VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`,
            [
              `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
              usuarioEmail,
              '$2b$10$Un9uYn.H5.d2fHpxkUexl.ZtZexGvS2P1g2T9Dq0aFvU8ZqBlyR82',
              empleado.empleado_id
            ]
          );
          userId = userRes.rows[0].usuario_id;
          await client.query(
            `INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, 3) ON CONFLICT DO NOTHING`,
            [userId]
          );
        }

        if (permitir_autoconsumo) {
          await client.query(
            `INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo)
             SELECT $1, permiso_id, 'conceder' FROM permiso WHERE permiso_clave = 'autoconsumo.crear'
             ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET tipo = 'conceder'`,
            [userId]
          );
        }
        if (permitir_firmas) {
          await client.query(
            `INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo)
             SELECT $1, permiso_id, 'conceder' FROM permiso WHERE permiso_clave = 'requerimientos.firmar'
             ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET tipo = 'conceder'`,
            [userId]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: empleado,
        message: 'Empleado creado exitosamente'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      console.error('Error al crear empleado:', error);
      throw new AppError('Error al crear empleado en base de datos', 500);
    } finally {
      client.release();
    }
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { cedula, nombre, apellido, departamento_id, centro_costos_id, email, cargo, foto_perfil, firma, activo, permitir_autoconsumo, permitir_firmas } = req.body;

      if (!cedula || !nombre || !apellido) {
        throw new AppError('Cédula, nombre y apellido son requeridos', 400);
      }

      if (!isValidCedulaEcuatoriana(cedula)) {
        throw new AppError('El número de cédula ingresado no es válido para Ecuador', 400);
      }

      if (email && !isValidEmail(email)) {
        throw new AppError('Formato de correo electrónico inválido', 400);
      }

      const dupRes = await pool.query('SELECT empleado_id FROM empleado WHERE empleado_cedula = $1 AND empleado_id <> $2', [cedula.trim(), id]);
      if (dupRes.rows.length > 0) {
        throw new AppError('Ya existe otro empleado con esa cédula', 400);
      }

      const updateRes = await pool.query(
        `UPDATE empleado 
         SET empleado_cedula = $1, empleado_nombre = $2, empleado_apellido = $3, departamento_id = $4, centro_costos_id = $5, empleado_email = $6, empleado_cargo = $7, empleado_foto = $8, empleado_firma = $9, empleado_estado = $10, empleado_fecha_modificacion = CURRENT_TIMESTAMP
         WHERE empleado_id = $11 RETURNING *`,
        [
          cedula.trim(), 
          nombre.trim(), 
          apellido.trim(), 
          departamento_id || null, 
          centro_costos_id || null, 
          email ? email.trim() : null, 
          cargo ? cargo.trim() : null, 
          foto_perfil || null, 
          firma || null,
          activo ? 'activo' : 'inactivo', 
          id
        ]
      );

      if (updateRes.rows.length === 0) {
        throw new AppError('Empleado no encontrado', 404);
      }

      const empleado = updateRes.rows[0];

      // Buscar si existe el usuario para este empleado
      const userCheck = await pool.query('SELECT usuario_id FROM usuario WHERE empleado_id = $1', [id]);
      let userId: number | null = null;
      
      if (userCheck.rows.length > 0) {
        userId = userCheck.rows[0].usuario_id;
      } else if (permitir_autoconsumo || permitir_firmas) {
        // Crear usuario nuevo para el colaborador
        const userRes = await pool.query(
          `INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado)
           VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`,
          [
            `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
            empleado.empleado_email || `colaborador_${empleado.empleado_cedula}@empresa.local`,
            '$2b$10$Un9uYn.H5.d2fHpxkUexl.ZtZexGvS2P1g2T9Dq0aFvU8ZqBlyR82',
            id
          ]
        );
        userId = userRes.rows[0].usuario_id;
        // Asignar rol empleado base
        await pool.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, 3) ON CONFLICT DO NOTHING', [userId]);
      }

      if (userId) {
        // Reactivar usuario si estuviera inactivo
        await pool.query("UPDATE usuario SET usuario_estado = 'activo' WHERE usuario_id = $1", [userId]);

        // Permiso de Autoconsumo (autoconsumo.crear)
        if (permitir_autoconsumo) {
          await pool.query(
            `INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo)
             SELECT $1, permiso_id, 'conceder' FROM permiso WHERE permiso_clave = 'autoconsumo.crear'
             ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET tipo = 'conceder'`,
            [userId]
          );
        } else {
          await pool.query(
            `DELETE FROM usuario_permiso 
             WHERE usuario_id = $1 
               AND permiso_id IN (SELECT permiso_id FROM permiso WHERE permiso_clave = 'autoconsumo.crear')`,
            [userId]
          );
        }

        // Permiso de Firma (requerimientos.firmar)
        if (permitir_firmas) {
          await pool.query(
            `INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo)
             SELECT $1, permiso_id, 'conceder' FROM permiso WHERE permiso_clave = 'requerimientos.firmar'
             ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET tipo = 'conceder'`,
            [userId]
          );
        } else {
          await pool.query(
            `DELETE FROM usuario_permiso 
             WHERE usuario_id = $1 
               AND permiso_id IN (SELECT permiso_id FROM permiso WHERE permiso_clave = 'requerimientos.firmar')`,
            [userId]
          );
        }
      }

      res.json({
        success: true,
        data: empleado,
        message: 'Empleado actualizado exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar empleado', 500);
    }
  },

  delete: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      // Verificar si existe el empleado
      const empRes = await pool.query('SELECT * FROM empleado WHERE empleado_id = $1', [id]);
      if (empRes.rows.length === 0) {
        throw new AppError('Empleado no encontrado', 404);
      }

      try {
        await pool.query('DELETE FROM empleado WHERE empleado_id = $1', [id]);
        res.json({
          success: true,
          message: 'Empleado eliminado físicamente de la base de datos'
        });
      } catch (err) {
        // Si hay integridad referencial, desactivarlo
        await pool.query("UPDATE empleado SET empleado_estado = 'inactivo', empleado_fecha_desactivacion = CURRENT_TIMESTAMP WHERE empleado_id = $1", [id]);
        res.json({
          success: true,
          message: 'Empleado inactivado debido a que tiene transacciones registradas'
        });
      }
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al eliminar empleado', 500);
    }
  },

  updateSignature: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { firma } = req.body;

      if (!firma) {
        throw new AppError('La firma es requerida', 400);
      }

      const updateRes = await pool.query(
        `UPDATE empleado 
         SET empleado_firma = $1, empleado_fecha_modificacion = CURRENT_TIMESTAMP
         WHERE empleado_id = $2 RETURNING *`,
        [firma, id]
      );

      if (updateRes.rows.length === 0) {
        throw new AppError('Empleado no encontrado', 404);
      }

      res.json({
        success: true,
        data: updateRes.rows[0],
        message: 'Firma digitalizada actualizada exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar la firma del empleado', 500);
    }
  },

  getDepartamentos: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const depRes = await pool.query("SELECT departamento_id as id, departamento_nombre as nombre FROM departamento WHERE departamento_estado = 'activo' ORDER BY departamento_nombre ASC");
      res.json({ success: true, data: depRes.rows });
    } catch (error) {
      throw new AppError('Error al obtener departamentos', 500);
    }
  },

  getCentrosCostos: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ccRes = await pool.query("SELECT centro_costos_id as id, centro_costos_nombre as nombre FROM centro_costos WHERE centro_costos_estado = 'activo' ORDER BY centro_costos_nombre ASC");
      res.json({ success: true, data: ccRes.rows });
    } catch (error) {
      throw new AppError('Error al obtener centros de costos', 500);
    }
  }
};
