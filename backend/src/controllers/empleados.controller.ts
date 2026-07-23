// backend/src/controllers/empleados.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { isValidEmail, isValidCedulaEcuatoriana } from '../utils/validators';

export const empleadosController = {
  // Obtener todos los empleados
  getAll: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let query = `
        SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre
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
        cargo: row.empleado_cargo || 'Empleado',
        email: row.empleado_email || '',
        foto_perfil: row.empleado_foto || `https://ui-avatars.com/api/?name=${row.empleado_nombre}+${row.empleado_apellido}&size=128`,
        activo: row.empleado_estado === 'activo'
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
        `SELECT e.*, d.departamento_nombre 
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
          activo: empleado.empleado_estado === 'activo'
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
    try {
      const { cedula, nombre, apellido, departamento_id, centro_costos_id, email, cargo, foto_perfil, activo } = req.body;

      if (!cedula || !nombre || !apellido) {
        throw new AppError('Cédula, nombre y apellido son requeridos', 400);
      }

      if (!isValidCedulaEcuatoriana(cedula)) {
        throw new AppError('El número de cédula ingresado no es válido para Ecuador', 400);
      }

      if (email && !isValidEmail(email)) {
        throw new AppError('Formato de correo electrónico inválido', 400);
      }

      const dupRes = await pool.query('SELECT empleado_id FROM empleado WHERE empleado_cedula = $1', [cedula.trim()]);
      if (dupRes.rows.length > 0) {
        throw new AppError('Ya existe un empleado con esa cédula', 400);
      }

      const insertRes = await pool.query(
        `INSERT INTO empleado (empleado_cedula, empleado_nombre, empleado_apellido, departamento_id, centro_costos_id, empleado_email, empleado_cargo, empleado_foto, empleado_estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          cedula.trim(), 
          nombre.trim(), 
          apellido.trim(), 
          departamento_id || null, 
          centro_costos_id || null, 
          email ? email.trim() : null, 
          cargo ? cargo.trim() : null, 
          foto_perfil || null, 
          activo !== false ? 'activo' : 'inactivo'
        ]
      );

      res.status(201).json({
        success: true,
        data: insertRes.rows[0],
        message: 'Empleado creado exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear empleado en base de datos', 500);
    }
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { cedula, nombre, apellido, departamento_id, centro_costos_id, email, cargo, foto_perfil, activo } = req.body;

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
         SET empleado_cedula = $1, empleado_nombre = $2, empleado_apellido = $3, departamento_id = $4, centro_costos_id = $5, empleado_email = $6, empleado_cargo = $7, empleado_foto = $8, empleado_estado = $9, empleado_fecha_modificacion = CURRENT_TIMESTAMP
         WHERE empleado_id = $10 RETURNING *`,
        [
          cedula.trim(), 
          nombre.trim(), 
          apellido.trim(), 
          departamento_id || null, 
          centro_costos_id || null, 
          email ? email.trim() : null, 
          cargo ? cargo.trim() : null, 
          foto_perfil || null, 
          activo ? 'activo' : 'inactivo', 
          id
        ]
      );

      if (updateRes.rows.length === 0) {
        throw new AppError('Empleado no encontrado', 404);
      }

      res.json({
        success: true,
        data: updateRes.rows[0],
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