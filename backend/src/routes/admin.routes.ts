// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

import pool from '../config/db';

import { getUsuarioPermisos } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

const authorizeCrud = async (req: any, _res: any, next: any) => {
  try {
    const table = req.params.table || (req.path.includes('/roles/') ? 'rol' : '');
    if (!req.user?.id && !req.user?.rol_id) {
      throw new AppError('Usuario sin autenticación o rol asignado', 403);
    }

    const { permissions, isAdmin, roles } = await getUsuarioPermisos(req.user.id, req.user.rol_id);

    if (isAdmin) {
      return next();
    }

    if (['formato_requerimiento_config', 'formato_requerimiento_cambio'].includes(table)) {
      // El formato se consulta al imprimir un requerimiento; sus textos no contienen datos sensibles.
      if (req.method === 'GET') return next();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && permissions.has('configuracion.editar')) return next();
      throw new AppError('No tienes permisos para administrar el formato de requerimientos', 403);
    }

    // Cualquier usuario autenticado puede LEER todas las tablas (para llenar desplegables)
    if (req.method === 'GET') {
      return next();
    }

    // Validación granular para productos
    if (table === 'producto') {
      if (req.method === 'POST' && !permissions.has('productos.crear')) {
        throw new AppError('No tienes permiso para crear productos', 403);
      }
      if (req.method === 'PUT' && !permissions.has('productos.editar')) {
        throw new AppError('No tienes permiso para editar productos', 403);
      }
      if (req.method === 'PATCH' && req.path.endsWith('/status')) {
        const { activo } = req.body;
        const requiredPerm = activo ? 'productos.activar' : 'productos.desactivar';
        if (!permissions.has(requiredPerm)) {
          throw new AppError(`No tienes permiso para ${activo ? 'activar' : 'desactivar'} productos`, 403);
        }
      }
      if (req.method === 'DELETE' && !permissions.has('productos.eliminar')) {
        throw new AppError('No tienes permiso para eliminar productos', 403);
      }
      return next();
    }

    // Validación para proveedores y categorías en rol inventario
    if (roles.includes('inventario') && ['proveedor', 'categoria'].includes(table)) {
      return next();
    }

    // Validación para roles, permisos y módulos
    if (['rol', 'modulo', 'permiso', 'rol_permiso'].includes(table)) {
      if (req.method === 'GET' && (permissions.has('roles.ver') || permissions.has('roles.crear') || permissions.has('roles.editar'))) {
        return next();
      }
      if (req.method === 'POST' && permissions.has('roles.crear')) {
        return next();
      }
      if (req.method === 'PUT' && permissions.has('roles.editar')) {
        return next();
      }
      if (req.method === 'PATCH' && (permissions.has('roles.eliminar') || permissions.has('roles.editar'))) {
        return next();
      }
      if (req.method === 'DELETE' && permissions.has('roles.eliminar')) {
        return next();
      }
      throw new AppError(`No tienes permisos suficientes para modificar ${table}`, 403);
    }

    throw new AppError('No tienes permisos para administrar esta tabla', 403);
  } catch (error) {
    next(error);
  }
};

// Endpoints exclusivos de administración de Base de Datos
const authorizeAdminOnly = async (req: any, _res: any, next: any) => {
  try {
    if (!req.user?.rol_id) throw new AppError('Usuario no autenticado', 401);
    const rolRes = await pool.query('SELECT rol_nombre FROM rol WHERE rol_id = $1', [req.user.rol_id]);
    const rol = rolRes.rows[0]?.rol_nombre || '';
    if (rol !== 'admin') throw new AppError('Acceso exclusivo para administradores', 403);
    next();
  } catch (err) {
    next(err);
  }
};

router.get('/database/backup', authorizeAdminOnly, adminController.downloadDatabaseBackup);
router.get('/database/backups', authorizeAdminOnly, adminController.listDatabaseBackups);
router.post('/database/backups', authorizeAdminOnly, adminController.createDatabaseBackup);
router.get('/database/backups/:filename', authorizeAdminOnly, adminController.downloadBackupFile);
router.delete('/database/backups/:filename', authorizeAdminOnly, adminController.deleteDatabaseBackup);
router.get('/database/stats', authorizeAdminOnly, adminController.getDatabaseStats);

router.get('/roles/:rolId/permisos', authorizeCrud, adminController.getRolePermissions);
router.post('/roles/:rolId/permisos', authorizeCrud, adminController.saveRolePermissions);

router.get('/:table', authorizeCrud, adminController.read);
router.post('/:table', authorizeCrud, adminController.create);
router.put('/:table/:id', authorizeCrud, adminController.update);
router.patch('/:table/:id/status', authorizeCrud, adminController.toggleStatus);
router.delete('/:table/:id', authorizeCrud, adminController.delete);

export default router;
