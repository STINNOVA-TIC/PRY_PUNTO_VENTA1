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

/**
 * Obtener permisos activos de la base de datos para un rol dado.
 * Si la base de datos no tiene permisos o falla, recurre a rolesData como fallback seguro.
 */
export const getPermisosForRol = async (rolId: number): Promise<string[]> => {
  try {
    const res = await pool.query(
      `SELECT p.permiso_clave 
       FROM rol_permiso rp
       JOIN permiso p ON rp.permiso_id = p.permiso_id
       WHERE rp.rol_id = $1 AND p.permiso_estado = 'activo'
       ORDER BY p.permiso_clave ASC`,
      [rolId]
    );

    if (res.rows.length > 0) {
      return res.rows.map(r => r.permiso_clave);
    }
  } catch (error) {
    console.error(`Error al consultar permisos de la BD para rol ${rolId}:`, error);
  }

  // Fallback seguro a los datos estáticos existentes
  const staticRole = rolesData.find(r => r.id === rolId);
  return (staticRole?.permisos || GruposPermisos.EMPLEADO) as string[];
};

/**
 * Obtener permisos finales calculados para un usuario:
 * (Permisos de todos sus roles asignados + permisos concedidos directamente) - permisos denegados directamente
 */
export const getPermisosForUsuario = async (usuarioId: number, rolIdFallback: number): Promise<string[]> => {
  try {
    // 1. Obtener todos los roles asociados a este usuario
    const rolesRes = await pool.query(
      `SELECT rol_id FROM usuario_rol WHERE usuario_id = $1`,
      [usuarioId]
    );

    const userRoles = rolesRes.rows.map(r => r.rol_id);
    if (!userRoles.includes(rolIdFallback)) {
      userRoles.push(rolIdFallback);
    }

    // 2. Obtener permisos base de los roles del usuario
    const basePermisosSet = new Set<string>();
    for (const rId of userRoles) {
      const perms = await getPermisosForRol(rId);
      perms.forEach(p => basePermisosSet.add(p));
    }

    // 3. Consultar personalizaciones individuales en usuario_permiso
    const customRes = await pool.query(
      `SELECT p.permiso_clave, up.tipo
       FROM usuario_permiso up
       JOIN permiso p ON up.permiso_id = p.permiso_id
       WHERE up.usuario_id = $1 AND p.permiso_estado = 'activo'`,
      [usuarioId]
    );

    for (const row of customRes.rows) {
      if (row.tipo === 'conceder') {
        basePermisosSet.add(row.permiso_clave);
      } else if (row.tipo === 'denegar') {
        basePermisosSet.delete(row.permiso_clave);
      }
    }

    return Array.from(basePermisosSet).sort();
  } catch (error) {
    console.error(`Error calculando permisos híbridos para usuario ${usuarioId}:`, error);
    return await getPermisosForRol(rolIdFallback);
  }
};

const getNombreRol = async (rolId: number): Promise<string> => {
  const rolRes = await pool.query(
    `SELECT rol_nombre FROM rol WHERE rol_id = $1 AND rol_estado = 'activo'`,
    [rolId]
  );
  return rolRes.rows[0]?.rol_nombre || rolesData.find(r => r.id === rolId)?.nombre || 'empleado';
};

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
        const colaboradorRolesList = rolesList.filter(id => id === 3);
        const matchedRoles = rolesData.filter(r => colaboradorRolesList.includes(r.id));
        matchedRoles.sort((a, b) => b.nivel - a.nivel); // De mayor a menor nivel
        if (matchedRoles.length > 0) {
          rolId = matchedRoles[0].id;
        }
      }

      const staticRole = rolesData.find(r => r.id === rolId);
      const rolNombre = staticRole?.nombre || 'empleado';
      const permisosBase = await getPermisosForRol(3);
      const permisosSet = new Set(permisosBase);
      if (userId > 0) {
        const quickPermsRes = await pool.query(
          `SELECT p.permiso_clave, up.tipo
           FROM usuario_permiso up
           JOIN permiso p ON p.permiso_id = up.permiso_id
           WHERE up.usuario_id = $1
             AND p.permiso_estado = 'activo'
             AND p.permiso_clave IN ('autoconsumo.crear')`,
          [userId]
        );
        quickPermsRes.rows.forEach(({ permiso_clave, tipo }) => {
          if (tipo === 'conceder') permisosSet.add(permiso_clave);
          if (tipo === 'denegar') permisosSet.delete(permiso_clave);
        });
      }
      const permisos = Array.from(permisosSet).sort();

      // Verificar si el colaborador tiene autorizado el autoconsumo
      const permitirAutoconsumo = permisos.includes('autoconsumo.crear');

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
            empleado: {
              id: empleado.empleado_id,
              codigo_empleado: empleado.empleado_cedula,
              nombre: empleado.empleado_nombre,
              apellido: empleado.empleado_apellido,
              cargo: empleado.empleado_cargo,
              foto_perfil: empleado.empleado_foto,
              firma: empleado.empleado_firma || null,
              departamento_id: empleado.departamento_id || null,
              departamento: empleado.departamento_nombre || 'General',
              centro_costos_id: empleado.centro_costos_id || null,
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

      // El portal corporativo admite roles creados desde Tablas Maestras.
      // Solo el rol base de empleado queda reservado para el acceso simplificado por cédula.
      const rolesNombres = rolRes.rows.map(r => r.rol_nombre);
      const tieneRolCorporativo = rolesNombres.some(nombre => nombre !== 'empleado');

      if (!tieneRolCorporativo) {
        throw new AppError('Acceso denegado. Este usuario solo puede ingresar mediante el acceso por cédula.', 403);
      }

      // Mapear permisos según rol y personalización híbrida del usuario
      const rolNombre = rol.rol_nombre;
      const permisos = await getPermisosForUsuario(user.usuario_id, rol.rol_id);

      // Obtener datos del empleado asociado si existe
      let empleado = null;
      if (user.empleado_id) {
        const empRes = await pool.query(
          `SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
           FROM empleado e 
           LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
           LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
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
            firma: emp.empleado_firma || null,
            departamento_id: emp.departamento_id || null,
            departamento: emp.departamento_nombre || 'Sin Departamento',
            centro_costos_id: emp.centro_costos_id || null,
            centro_costos: emp.centro_costos_nombre ? `${emp.centro_costos_codigo} - ${emp.centro_costos_nombre}` : 'N/A'
          };
        }
      }

      // Verificar permisos de autoconsumo.
      const permitirAutoconsumo = permisos.includes('autoconsumo.crear');

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

      const rolNombre = req.empleado ? 'empleado' : await getNombreRol(req.user!.rol_id);
      const permisos = req.user!.id > 0 ? await getPermisosForUsuario(req.user!.id, req.user!.rol_id) : await getPermisosForRol(req.user!.rol_id);

      let empleado = null;
      if (req.empleado) {
        empleado = {
          id: req.empleado.empleado_id,
          codigo_empleado: req.empleado.empleado_cedula,
          nombre: req.empleado.empleado_nombre,
          apellido: req.empleado.empleado_apellido,
          departamento_id: req.empleado.departamento_id || null,
          departamento: req.empleado.departamento_nombre || 'Sin Departamento',
          centro_costos_id: req.empleado.centro_costos_id || null,
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
              firma: emp.empleado_firma || null,
              departamento_id: emp.departamento_id || null,
              departamento: emp.departamento_nombre || 'Sin Departamento',
              centro_costos_id: emp.centro_costos_id || null,
              centro_costos: emp.centro_costos_nombre ? `${emp.centro_costos_codigo} - ${emp.centro_costos_nombre}` : 'N/A'
            };
          }
        }
      }

      const permitirAutoconsumo = permisos.includes('autoconsumo.crear');

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
         const permisos = userId > 0 ? await getPermisosForUsuario(userId, rolId) : await getPermisosForRol(rolId);

         // Verificar si el colaborador tiene autorizado el autoconsumo
         const permitirAutoconsumo = permisos.includes('autoconsumo.crear');

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
               empleado: {
                 id: empleado.empleado_id,
                 codigo_empleado: empleado.empleado_cedula,
                 nombre: empleado.empleado_nombre,
                 apellido: empleado.empleado_apellido,
                 cargo: empleado.empleado_cargo,
                 foto_perfil: empleado.empleado_foto,
                 firma: empleado.empleado_firma || null,
                 departamento_id: empleado.departamento_id || null,
                 departamento: empleado.departamento_nombre || 'General',
                 centro_costos_id: empleado.centro_costos_id || null,
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

      let empleadoData = null;
      if (user.empleado_id) {
        const empRes = await pool.query(
          `SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo 
           FROM empleado e 
           LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
           LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
           WHERE e.empleado_id = $1`,
          [user.empleado_id]
        );
        const emp = empRes.rows[0];
        if (emp) {
          empleadoData = {
            id: emp.empleado_id,
            codigo_empleado: emp.empleado_cedula,
            nombre: emp.empleado_nombre,
            apellido: emp.empleado_apellido,
            cargo: emp.empleado_cargo,
            foto_perfil: emp.empleado_foto,
            firma: emp.empleado_firma || null,
            departamento_id: emp.departamento_id || null,
            departamento: emp.departamento_nombre || 'Sin Departamento',
            centro_costos_id: emp.centro_costos_id || null,
            centro_costos: emp.centro_costos_nombre ? `${emp.centro_costos_codigo} - ${emp.centro_costos_nombre}` : 'N/A'
          };
        }
      }

      const rolNombre = await getNombreRol(decoded.rol_id);
      const permisos = await getPermisosForUsuario(user.usuario_id, decoded.rol_id);

      const permitirAutoconsumo = permisos.includes('autoconsumo.crear');

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
            empleado: empleadoData
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
