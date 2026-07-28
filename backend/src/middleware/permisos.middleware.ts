// backend/src/middleware/permisos.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { rolesData } from '../models/roles.data';
import { Permiso } from '../types/permisos';
import pool from '../config/db';

// Helper para obtener la unión de todos los permisos de los roles del usuario
async function getUsuarioPermisos(userId: number, defaultRolId: number): Promise<{ permissions: Set<string>; isAdmin: boolean; roles: string[] }> {
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

  const matchedRoles = rolesData.filter(r => rolesList.includes(r.id));
  const allPermisos = new Set<string>();
  let isAdmin = false;
  const rolesNames: string[] = [];

  matchedRoles.forEach(r => {
    rolesNames.push(r.nombre);
    if (r.nombre === 'admin') {
      isAdmin = true;
    }
    r.permisos.forEach(p => allPermisos.add(p));
  });

  return { permissions: allPermisos, isAdmin, roles: rolesNames };
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

      const { permissions, isAdmin, roles } = await getUsuarioPermisos(req.user.id, req.user.rol_id);

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

      const { permissions, isAdmin, roles } = await getUsuarioPermisos(req.user.id, req.user.rol_id);

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

      const { permissions, isAdmin, roles } = await getUsuarioPermisos(req.user.id, req.user.rol_id);

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

      const { permissions, isAdmin, roles } = await getUsuarioPermisos(req.user.id, req.user.rol_id);

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