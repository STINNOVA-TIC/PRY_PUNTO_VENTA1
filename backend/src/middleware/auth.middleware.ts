import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { IUsuario } from '../types/index';

export interface AuthRequest extends Request {
  user?: IUsuario;
  empleado?: any;
  io?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    // Verificar si es una sesión de empleado puro (cédula)
    if (decoded.empleado_id) {
      const empleadoRes = await pool.query(
        `SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
         FROM empleado e 
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
         LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
         WHERE e.empleado_id = $1 AND e.empleado_estado = 'activo'`,
        [decoded.empleado_id]
      );
      const empleado = empleadoRes.rows[0];

      if (!empleado) {
        return res.status(401).json({ message: 'Empleado no encontrado o inactivo' });
      }

      // Crear usuario virtual para cumplir con req.user
      req.user = {
        id: 0, // ID virtual
        nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
        email: empleado.empleado_email || '',
        password_hash: '',
        rol_id: 3, // Rol empleado
        activo: true,
        fecha_creacion: empleado.empleado_fecha_creacion,
      };
      req.empleado = empleado;
      return next();
    }

    // Sesión de usuario administrativo normal (email / password)
    const userRes = await pool.query(
      'SELECT * FROM usuario WHERE usuario_id = $1 AND usuario_estado = \'activo\'',
      [decoded.id]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    // Mapear base de datos a interfaz IUsuario (id en lugar de usuario_id)
    req.user = {
      id: user.usuario_id,
      nombre: user.usuario_nombre,
      email: user.usuario_email,
      password_hash: user.usuario_password,
      rol_id: decoded.rol_id,
      activo: user.usuario_estado === 'activo',
      fecha_creacion: user.usuario_fecha_creacion,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};