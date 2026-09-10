// backend/src/middleware/permisos.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { Permiso } from '../types/permisos';
import pool from '../config/db';

// Helper para obtener los permisos efectivos del usuario
export async function getUsuarioPermisos(userId: number, defaultRolId: number): Promise<{ permissions: Set<string>; isAdmin: boolean; roles: string[] }> {
  const rolesList: number[] = [];
  
  if (userId && userId !== 0) {
    const userRolesRes = await pool.query(
      'SELECT rol_id FROM usuario_rol WHERE usuario_id = $1',
      [userId]
    );
    rolesList.push(...userRolesRes.rows.map(r => r.rol_id));
  }
  
  if (rolesList.length === 0 && defaultRolId) {
    rolesList.push(defaultRolId);
  }

  // 1. Obtener nombres de roles
  const rolesRes = await pool.query(
    'SELECT rol_id, rol_nombre FROM rol WHERE rol_id = ANY($1)',
    [rolesList]
  );
  const rolesNames: string[] = rolesRes.rows.map(r => r.rol_nombre);
  const isAdmin = rolesNames.includes('admin') || rolesList.includes(1);

  // 2. Obtener permisos híbridos reales (DB + personalizados)
  const allPermisos = new Set<string>();

  if (userId && userId !== 0) {
    const { getPermisosForUsuario } = await import('../controllers/auth.controller');
    const userPerms = await getPermisosForUsuario(userId, defaultRolId || 3);
    userPerms.forEach(p => allPermisos.add(p));
  } else {
    const { getPermisosForRol } = await import('../controllers/auth.controller');
    for (const rId of rolesList) {
      const perms = await getPermisosForRol(rId);
      perms.forEach(p => allPermisos.add(p));
    }
  }

  return { permissions: allPermisos, isAdmin, roles: rolesNames.length > 0 ? rolesNames : ['empleado'] };
}

// Las sesiones por cédula nunca heredan roles corporativos de una cuenta vinculada.
// Solo admiten los permisos base del colaborador y las excepciones personales de acceso rápido.
async function getPermisosPeticion(req: AuthRequest): Promise<{ permissions: Set<string>; isAdmin: boolean; roles: string[] }> {
  if (!req.empleado) {
    return getUsuarioPermisos(req.user?.id || 0, req.user?.rol_id || 3);
  }

  const base = await getUsuarioPermisos(0, 3);
  const allowedQuickPermissions = ['autoconsumo.crear', 'requerimientos.firmar'];
  const customRes = await pool.query(
    `SELECT p.permiso_clave, up.tipo
     FROM usuario u
     JOIN usuario_permiso up ON up.usuario_id = u.usuario_id
     JOIN permiso p ON p.permiso_id = up.permiso_id
     WHERE u.empleado_id = $1
       AND u.usuario_estado = 'activo'
       AND p.permiso_estado = 'activo'
       AND p.permiso_clave = ANY($2)`,
    [req.empleado.empleado_id, allowedQuickPermissions]
  );

  customRes.rows.forEach(({ permiso_clave, tipo }) => {
    if (tipo === 'conceder') base.permissions.add(permiso_clave);
    if (tipo === 'denegar') base.permissions.delete(permiso_clave);
  });

  return { permissions: base.permissions, isAdmin: false, roles: ['empleado'] };
}

// Verificar si el usuario tiene un permiso específico
export const requirePermission = (permiso: Permiso) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false,
          message: 'No autenticado' 
        });
        return;
      }

      const { permissions, isAdmin, roles } = await getPermisosPeticion(req);

      if (roles.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      if (!isAdmin && !permissions.has(permiso)) {
        res.status(403).json({
          success: false,
          message: `No tienes permiso para: ${permiso}`,
          required: permiso,
          currentRole: roles.join(', ')
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Verificar si el usuario tiene ALGUNO de los permisos
export const requireAnyPermission = (...permisos: Permiso[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false,
          message: 'No autenticado' 
        });
        return;
      }

      const { permissions, isAdmin, roles } = await getPermisosPeticion(req);

      if (roles.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      const hasPermission = isAdmin || permisos.some(p => permissions.has(p));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `No tienes ninguno de los permisos requeridos: ${permisos.join(', ')}`,
          required: permisos,
          currentRole: roles.join(', ')
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Verificar si el usuario tiene TODOS los permisos
export const requireAllPermissions = (...permisos: Permiso[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false,
          message: 'No autenticado' 
        });
        return;
      }

      const { permissions, isAdmin, roles } = await getPermisosPeticion(req);

      if (roles.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      const missingPermissions = isAdmin ? [] : permisos.filter(p => !permissions.has(p));

      if (missingPermissions.length > 0) {
        res.status(403).json({
          success: false,
          message: `Faltan permisos: ${missingPermissions.join(', ')}`,
          missing: missingPermissions,
          currentRole: roles.join(', ')
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Middleware para verificar que un usuario puede acceder a sus propios datos o a los de otros
export const requireSelfOrPermission = (permiso: Permiso) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false,
          message: 'No autenticado' 
        });
        return;
      }

      const { permissions, isAdmin, roles } = await getPermisosPeticion(req);

      if (roles.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      const userId = parseInt(req.params.id);
      const isSelf = req.user.id === userId;
      const hasPermission = isAdmin || permissions.has(permiso);

      if (!isSelf && !hasPermission) {
        res.status(403).json({
          success: false,
          message: 'No tienes permiso para acceder a estos datos',
          required: permiso
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
