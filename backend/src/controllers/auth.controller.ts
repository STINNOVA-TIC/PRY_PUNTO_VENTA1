// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { GruposPermisos } from '../types/permisos';
import { rolesData } from '../models/roles.data';
import { isValidEmail, isValidPassword, isValidCedulaEcuatoriana } from '../utils/validators';

interface LoginRequest {
  email: string;
  password: string;
}

export const authController = {
  /**
   * Iniciar sesión de empleado por Cédula (Sin Contraseña)
   * POST /api/auth/employee-login
   */
  employeeLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      const { cedula } = req.body;

      if (!cedula) {
        throw new AppError('Número de cédula es requerido', 400);
      }

      if (!isValidCedulaEcuatoriana(cedula)) {
        throw new AppError('El número de cédula ingresado no es válido para Ecuador', 400);
      }

      // Buscar empleado por cédula en PostgreSQL
      const empRes = await pool.query(
        `SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
         FROM empleado e
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
         LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
         WHERE e.empleado_cedula = $1 AND e.empleado_estado = 'activo'`,
        [cedula.trim()]
      );
      const empleado = empRes.rows[0];

      if (!empleado) {
        throw new AppError('Cédula no registrada o empleado inactivo', 401);
      }

      // Buscar si el empleado tiene un usuario asociado para obtener sus permisos reales
      const userRolesRes = await pool.query(
        `SELECT ur.rol_id, u.usuario_id 
         FROM usuario u
         JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
         WHERE u.empleado_id = $1 AND u.usuario_estado = 'activo'`,
        [empleado.empleado_id]
      );

      let rolId = 3; // Por defecto rol de empleado
      let userId = 0;

      if (userRolesRes.rows.length > 0) {
        userId = userRolesRes.rows[0].usuario_id;
        const rolesList = userRolesRes.rows.map(r => r.rol_id);
        // Restricción de seguridad: Limitar Cédula únicamente a roles de colaborador (3, 8, 9)
        const colaboradorRolesList = rolesList.filter(id => [3, 8, 9].includes(id));
        const matchedRoles = rolesData.filter(r => colaboradorRolesList.includes(r.id));
        matchedRoles.sort((a, b) => b.nivel - a.nivel); // De mayor a menor nivel
        if (matchedRoles.length > 0) {
          rolId = matchedRoles[0].id;
        }
      }

      const staticRole = rolesData.find(r => r.id === rolId);
      const rolNombre = staticRole?.nombre || 'empleado';
      const permisos = staticRole?.permisos || GruposPermisos.EMPLEADO;

      // Verificar si el colaborador tiene autorizado el autoconsumo (rol_id 8 asignado)
      const autoconsumoCheck = await pool.query(
        `SELECT 1 FROM usuario u
         JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
         WHERE u.empleado_id = $1 AND ur.rol_id = 8 AND u.usuario_estado = 'activo'
         LIMIT 1`,
        [empleado.empleado_id]
      );
      const permitirAutoconsumo = autoconsumoCheck.rows.length > 0;

      // Verificar si el colaborador tiene autorizado firmar requerimientos (rol_id 9 asignado)
      const firmasCheck = await pool.query(
        `SELECT 1 FROM usuario u
         JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
         WHERE u.empleado_id = $1 AND ur.rol_id = 9 AND u.usuario_estado = 'activo'
         LIMIT 1`,
        [empleado.empleado_id]
      );
      const permitirFirmas = firmasCheck.rows.length > 0;

      // Generar Token JWT con el rol y el ID real/virtual
      const token = jwt.sign(
        { 
          id: userId,
          empleado_id: empleado.empleado_id, 
          rol_id: rolId 
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '8h' }
      );

      res.json({
        success: true,
        data: {
          token,
          usuario: {
            id: userId,
            nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
            email: empleado.empleado_email || '',
            rol: {
              id: rolId,
              nombre: rolNombre,
              permisos
            },
            permitir_autoconsumo: permitirAutoconsumo,
            permitir_firmas: permitirFirmas,
            empleado: {
              id: empleado.empleado_id,
              codigo_empleado: empleado.empleado_cedula,
              nombre: empleado.empleado_nombre,
              apellido: empleado.empleado_apellido,
              cargo: empleado.empleado_cargo,
              foto_perfil: empleado.empleado_foto,
              departamento: empleado.departamento_nombre || 'General',
              centro_costos: empleado.centro_costos_nombre ? `${empleado.centro_costos_codigo} - ${empleado.centro_costos_nombre}` : 'N/A'
            }
          }
        }
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al iniciar sesión por cédula', 500);
    }
  },

  /**
   * Iniciar sesión administrativa/bodega normal (correo/contraseña)
   * POST /api/auth/login
   */
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        throw new AppError('Email y contraseña son requeridos', 400);
      }

      if (!isValidEmail(email)) {
        throw new AppError('Formato de correo electrónico inválido', 400);
      }

      if (!isValidPassword(password)) {
        throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
      }

      // Buscar usuario en PostgreSQL
      const userRes = await pool.query(
        "SELECT * FROM usuario WHERE usuario_email = $1 AND usuario_estado = 'activo'",
        [email.trim().toLowerCase()]
      );
      const user = userRes.rows[0];

      if (!user) {
        throw new AppError('Credenciales incorrectas', 401);
      }

      // Verificar contraseña
      const isMatch = await bcrypt.compare(password, user.usuario_password);
      if (!isMatch) {
        throw new AppError('Credenciales incorrectas', 401);
      }

      // Obtener rol del usuario
      const rolRes = await pool.query(
        `SELECT r.* FROM rol r
         JOIN usuario_rol ur ON r.rol_id = ur.rol_id
         WHERE ur.usuario_id = $1`,
        [user.usuario_id]
      );
      const rol = rolRes.rows[0];

      if (!rol) {
        throw new AppError('Rol de usuario no encontrado', 500);
      }

      // Restricción de Seguridad: Colaboradores no pueden ingresar por este portal (usuario y contraseña)
      const rolesNombres = rolRes.rows.map(r => r.rol_nombre);
      const tieneRolOperador = rolesNombres.some(nombre => 
        ['admin', 'guardia', 'inventario', 'contador', 'gerente', 'tthh'].includes(nombre)
      );

      if (!tieneRolOperador) {
        throw new AppError('Acceso denegado. Este portal es de uso exclusivo para operadores y administradores.', 403);
      }

      // Mapear permisos según rol dinámicamente desde static rolesData
      const staticRole = rolesData.find(r => r.id === rol.rol_id);
      const rolNombre = staticRole?.nombre || 'empleado';
      const permisos = staticRole?.permisos || GruposPermisos.EMPLEADO;

      // Obtener datos del empleado asociado si existe
      let empleado = null;
      if (user.empleado_id) {
        const empRes = await pool.query(
          `SELECT e.*, d.departamento_nombre 
           FROM empleado e 
           LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
           WHERE e.empleado_id = $1`,
          [user.empleado_id]
        );
        const emp = empRes.rows[0];
        if (emp) {
          empleado = {
            id: emp.empleado_id,
            codigo_empleado: emp.empleado_cedula,
            nombre: emp.empleado_nombre,
            apellido: emp.empleado_apellido,
            cargo: emp.empleado_cargo,
            foto_perfil: emp.empleado_foto,
            departamento: emp.departamento_nombre || 'Sin Departamento'
          };
        }
      }

      // Verificar si el colaborador tiene autorizado el autoconsumo (rol_id 8 asignado)
      const autoconsumoCheck = await pool.query(
        `SELECT 1 FROM usuario_rol 
         WHERE usuario_id = $1 AND rol_id = 8`,
        [user.usuario_id]
      );
      const permitirAutoconsumo = autoconsumoCheck.rows.length > 0;

      // Verificar si el colaborador tiene autorizado firmar requerimientos (rol_id 9 asignado)
      const firmasCheck = await pool.query(
        `SELECT 1 FROM usuario_rol 
         WHERE usuario_id = $1 AND rol_id = 9`,
        [user.usuario_id]
      );
      const permitirFirmas = firmasCheck.rows.length > 0;

      // Generar Token JWT
      const token = jwt.sign(
        { 
          id: user.usuario_id, 
          rol_id: rol.rol_id 
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '8h' }
      );

      res.json({
        success: true,
        data: {
          token,
          usuario: {
            id: user.usuario_id,
            nombre: user.usuario_nombre,
            email: user.usuario_email,
            rol: {
              id: rol.rol_id,
              nombre: rolNombre,
              permisos
            },
            permitir_autoconsumo: permitirAutoconsumo,
            permitir_firmas: permitirFirmas,
            empleado
          }
        }
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al iniciar sesión', 500);
    }
  },

  /**
   * Obtener perfil del usuario autenticado
   * GET /api/auth/me
   */
  getMe: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const staticRole = rolesData.find(r => r.id === req.user!.rol_id);
      const rolNombre = staticRole?.nombre || 'empleado';
      const permisos = staticRole?.permisos || GruposPermisos.EMPLEADO;

      let empleado = null;
      if (req.empleado) {
        empleado = {
          id: req.empleado.empleado_id,
          codigo_empleado: req.empleado.empleado_cedula,
          nombre: req.empleado.empleado_nombre,
          apellido: req.empleado.empleado_apellido,
          departamento: req.empleado.departamento_nombre || 'Sin Departamento',
          centro_costos: req.empleado.centro_costos_nombre ? `${req.empleado.centro_costos_codigo} - ${req.empleado.centro_costos_nombre}` : 'N/A',
          cargo: req.empleado.empleado_cargo,
          foto_perfil: req.empleado.empleado_foto
        };
      } else if (req.user.id !== 0) {
        // Si es usuario admin/operator, verificar si tiene empleado_id
        const userRes = await pool.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
        const empId = userRes.rows[0]?.empleado_id;
        if (empId) {
          const empRes = await pool.query(
            `SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo 
             FROM empleado e 
             LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
             LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
             WHERE e.empleado_id = $1`,
            [empId]
          );
          const emp = empRes.rows[0];
          if (emp) {
            empleado = {
              id: emp.empleado_id,
              codigo_empleado: emp.empleado_cedula,
              nombre: emp.empleado_nombre,
              apellido: emp.empleado_apellido,
              cargo: emp.empleado_cargo,
              foto_perfil: emp.empleado_foto,
              departamento: emp.departamento_nombre || 'Sin Departamento',
              centro_costos: emp.centro_costos_nombre ? `${emp.centro_costos_codigo} - ${emp.centro_costos_nombre}` : 'N/A'
            };
          }
        }
      }

      // Verificar si el colaborador tiene autorizado el autoconsumo (rol_id 8 asignado)
      let permitirAutoconsumo = false;
      let permitirFirmas = false;
      const targetEmpId = req.empleado?.empleado_id || (req.user?.id && req.user.id !== 0 
        ? (await pool.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id])).rows[0]?.empleado_id 
        : null);
      
      if (targetEmpId) {
        const autoconsumoCheck = await pool.query(
          `SELECT 1 FROM usuario u
           JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
           WHERE u.empleado_id = $1 AND ur.rol_id = 8 AND u.usuario_estado = 'activo'
           LIMIT 1`,
          [targetEmpId]
        );
        permitirAutoconsumo = autoconsumoCheck.rows.length > 0;

        const firmasCheck = await pool.query(
          `SELECT 1 FROM usuario u
           JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
           WHERE u.empleado_id = $1 AND ur.rol_id = 9 AND u.usuario_estado = 'activo'
           LIMIT 1`,
          [targetEmpId]
        );
        permitirFirmas = firmasCheck.rows.length > 0;
      }

      res.json({
        success: true,
        data: {
          id: req.user.id,
          nombre: req.user.nombre,
          email: req.user.email,
          rol: {
            id: req.user.rol_id,
            nombre: rolNombre,
            permisos
          },
          permitir_autoconsumo: permitirAutoconsumo,
          permitir_firmas: permitirFirmas,
          empleado
        }
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener perfil', 500);
    }
  },

  /**
   * Verificar validez del Token
   * POST /api/auth/verify-token
   */
  verifyToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;
      if (!token) {
        throw new AppError('Token requerido', 400);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

      if (decoded.empleado_id) {
        const empRes = await pool.query(
          `SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
           FROM empleado e 
           LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
           LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
           WHERE e.empleado_id = $1 AND e.empleado_estado = 'activo'`,
          [decoded.empleado_id]
        );
         if (empRes.rows.length === 0) {
           throw new AppError('Empleado inactivo', 401);
         }
         const empleado = empRes.rows[0];

          // Buscar si el empleado tiene un usuario asociado para obtener sus permisos reales
          const userRolesRes = await pool.query(
            `SELECT ur.rol_id, u.usuario_id 
             FROM usuario u
             JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
             WHERE u.empleado_id = $1 AND u.usuario_estado = 'activo'`,
            [empleado.empleado_id]
          );

          let rolId = 3; // Por defecto rol de empleado
          let userId = 0;

          if (userRolesRes.rows.length > 0) {
            userId = userRolesRes.rows[0].usuario_id;
            const rolesList = userRolesRes.rows.map(r => r.rol_id);
            // Restricción de seguridad: Limitar Cédula únicamente a roles de colaborador (3, 8, 9)
            const colaboradorRolesList = rolesList.filter(id => [3, 8, 9].includes(id));
            const matchedRoles = rolesData.filter(r => colaboradorRolesList.includes(r.id));
            matchedRoles.sort((a, b) => b.nivel - a.nivel); // De mayor a menor nivel
            if (matchedRoles.length > 0) {
              rolId = matchedRoles[0].id;
            }
          }

         const staticRole = rolesData.find(r => r.id === rolId);
         const rolNombre = staticRole?.nombre || 'empleado';
         const permisos = staticRole?.permisos || GruposPermisos.EMPLEADO;

         // Verificar si el colaborador tiene autorizado el autoconsumo (rol_id 8 asignado)
         const autoconsumoCheck = await pool.query(
           `SELECT 1 FROM usuario u
            JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
            WHERE u.empleado_id = $1 AND ur.rol_id = 8 AND u.usuario_estado = 'activo'
            LIMIT 1`,
           [empleado.empleado_id]
         );
         const permitirAutoconsumo = autoconsumoCheck.rows.length > 0;

         // Verificar si el colaborador tiene autorizado firmar requerimientos (rol_id 9 asignado)
         const firmasCheck = await pool.query(
           `SELECT 1 FROM usuario u
            JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
            WHERE u.empleado_id = $1 AND ur.rol_id = 9 AND u.usuario_estado = 'activo'
            LIMIT 1`,
           [empleado.empleado_id]
         );
         const permitirFirmas = firmasCheck.rows.length > 0;

         res.json({
           success: true,
           data: {
             valid: true,
             user: {
               id: userId,
               nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
               email: empleado.empleado_email || '',
               rol: {
                 id: rolId,
                 nombre: rolNombre,
                 permisos: permisos
               },
               permitir_autoconsumo: permitirAutoconsumo,
               permitir_firmas: permitirFirmas,
               empleado: {
                 id: empleado.empleado_id,
                 codigo_empleado: empleado.empleado_cedula,
                 nombre: empleado.empleado_nombre,
                 apellido: empleado.empleado_apellido,
                 cargo: empleado.empleado_cargo,
                 foto_perfil: empleado.empleado_foto,
                 departamento: empleado.departamento_nombre || 'General',
                 centro_costos: empleado.centro_costos_nombre ? `${empleado.centro_costos_codigo} - ${empleado.centro_costos_nombre}` : 'N/A'
               }
             }
           }
         });
         return;
      }

      const userRes = await pool.query('SELECT * FROM usuario WHERE usuario_id = $1 AND usuario_estado = \'activo\'', [decoded.id]);
      if (userRes.rows.length === 0) {
        throw new AppError('Usuario inactivo', 401);
      }
      const user = userRes.rows[0];

      const staticRole = rolesData.find(r => r.id === decoded.rol_id);
      const rolNombre = staticRole?.nombre || 'empleado';
      const permisos = staticRole?.permisos || GruposPermisos.EMPLEADO;

      // Verificar si el colaborador tiene autorizado el autoconsumo (rol_id 8 asignado)
      const autoconsumoCheck = await pool.query(
        `SELECT 1 FROM usuario_rol 
         WHERE usuario_id = $1 AND rol_id = 8`,
        [user.usuario_id]
      );
      const permitirAutoconsumo = autoconsumoCheck.rows.length > 0;

      // Verificar si el colaborador tiene autorizado firmar requerimientos (rol_id 9 asignado)
      const firmasCheck = await pool.query(
        `SELECT 1 FROM usuario_rol 
         WHERE usuario_id = $1 AND rol_id = 9`,
        [user.usuario_id]
      );
      const permitirFirmas = firmasCheck.rows.length > 0;

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            id: user.usuario_id,
            nombre: user.usuario_nombre,
            email: user.usuario_email,
            rol: {
              id: decoded.rol_id,
              nombre: rolNombre,
              permisos
            },
            permitir_autoconsumo: permitirAutoconsumo,
            permitir_firmas: permitirFirmas
          }
        }
      });
      return;
    } catch (error) {
      throw new AppError('Token inválido', 401);
    }
  },

  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, email, password, empleado_id, rol_id } = req.body;
      if (!nombre || !email || !password || !rol_id) {
        throw new AppError('Datos incompletos para el registro', 400);
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const userRes = await pool.query(
        `INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado) 
         VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`,
        [nombre, email, hashedPassword, empleado_id || null]
      );
      const userId = userRes.rows[0].usuario_id;
      await pool.query(
        `INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)`,
        [userId, rol_id]
      );
      res.status(201).json({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (error: any) {
      if (error.code === '23505') {
        throw new AppError('El email ya está registrado', 400);
      }
      throw new AppError('Error al registrar usuario', 500);
    }
  },

  forgotPassword: async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, message: 'Se ha enviado un enlace de recuperación a su correo electrónico.' });
  },

  resetPassword: async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, message: 'Su contraseña ha sido restablecida exitosamente.' });
  },

  logout: async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
  },

  changePassword: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!req.user) throw new AppError('No autenticado', 401);
      
      const userRes = await pool.query('SELECT * FROM usuario WHERE usuario_id = $1', [req.user.id]);
      const user = userRes.rows[0];
      if (!user) throw new AppError('Usuario no encontrado', 404);

      const isMatch = await bcrypt.compare(currentPassword, user.usuario_password);
      if (!isMatch) throw new AppError('Contraseña actual incorrecta', 400);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await pool.query('UPDATE usuario SET usuario_password = $1 WHERE usuario_id = $2', [hashedPassword, req.user.id]);

      res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al cambiar contraseña', 500);
    }
  },

  getUsers: async (_req: Request, res: Response): Promise<void> => {
    try {
      const usersRes = await pool.query(
        `SELECT u.usuario_id as id, u.usuario_nombre as nombre, u.usuario_email as email, u.usuario_estado as estado,
                r.rol_id, r.rol_nombre as rol_nombre
         FROM usuario u
         LEFT JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
         LEFT JOIN rol r ON ur.rol_id = r.rol_id
         ORDER BY u.usuario_id DESC`
      );
      res.json({ success: true, data: usersRes.rows });
    } catch (error) {
      throw new AppError('Error al obtener usuarios', 500);
    }
  },

  toggleUserStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userRes = await pool.query('SELECT usuario_estado FROM usuario WHERE usuario_id = $1', [id]);
      if (userRes.rows.length === 0) throw new AppError('Usuario no encontrado', 404);
      
      const currentStatus = userRes.rows[0].usuario_estado;
      const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
      await pool.query('UPDATE usuario SET usuario_estado = $1 WHERE usuario_id = $2', [newStatus, id]);

      res.json({ success: true, message: `Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente` });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al cambiar estado del usuario', 500);
    }
  }
};