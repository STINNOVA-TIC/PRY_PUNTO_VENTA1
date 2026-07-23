// backend/src/middleware/permisos.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { rolesData } from '../models/roles.data';
import { Permiso } from '../types/permisos';

// Verificar si el usuario tiene un permiso específico
export const requirePermission = (permiso: Permiso) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: 'No autenticado' 
      });
      return;
    }

    const userRole = rolesData.find(r => r.id === req.user!.rol_id);
    
    if (!userRole) {
      res.status(403).json({
        success: false,
        message: 'Rol no encontrado'
      });
      return;
    }

    if (!userRole.permisos.includes(permiso)) {
      res.status(403).json({
        success: false,
        message: `No tienes permiso para: ${permiso}`,
        required: permiso,
        currentRole: userRole.nombre
      });
      return;
    }

    next();
  };
};

// Verificar si el usuario tiene ALGUNO de los permisos
export const requireAnyPermission = (...permisos: Permiso[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: 'No autenticado' 
      });
      return;
    }

    const userRole = rolesData.find(r => r.id === req.user!.rol_id);
    
    if (!userRole) {
      res.status(403).json({
        success: false,
        message: 'Rol no encontrado'
      });
      return;
    }

    const hasPermission = permisos.some(p => userRole.permisos.includes(p));
    
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `No tienes ninguno de los permisos requeridos: ${permisos.join(', ')}`,
        required: permisos,
        currentRole: userRole.nombre
      });
      return;
    }

    next();
  };
};

// Verificar si el usuario tiene TODOS los permisos
export const requireAllPermissions = (...permisos: Permiso[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: 'No autenticado' 
      });
      return;
    }

    const userRole = rolesData.find(r => r.id === req.user!.rol_id);
    
    if (!userRole) {
      res.status(403).json({
        success: false,
        message: 'Rol no encontrado'
      });
      return;
    }

    const missingPermissions = permisos.filter(p => !userRole.permisos.includes(p));
    
    if (missingPermissions.length > 0) {
      res.status(403).json({
        success: false,
        message: `Faltan permisos: ${missingPermissions.join(', ')}`,
        missing: missingPermissions,
        currentRole: userRole.nombre
      });
      return;
    }

    next();
  };
};

// Middleware para verificar que un usuario puede acceder a sus propios datos o a los de otros
export const requireSelfOrPermission = (permiso: Permiso) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: 'No autenticado' 
      });
      return;
    }

    const userRole = rolesData.find(r => r.id === req.user!.rol_id);
    
    if (!userRole) {
      res.status(403).json({
        success: false,
        message: 'Rol no encontrado'
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const isSelf = req.user.id === userId;
    const hasPermission = userRole.permisos.includes(permiso);

    if (!isSelf && !hasPermission) {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a estos datos',
        required: permiso
      });
      return;
    }

    next();
  };
};