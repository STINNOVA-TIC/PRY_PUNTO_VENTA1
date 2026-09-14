"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/admin.routes.ts
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const db_1 = __importDefault(require("../config/db"));
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
const authorizeCrud = async (req, _res, next) => {
    try {
        const table = req.params.table || (req.path.includes('/roles/') ? 'rol' : '');
        if (!req.user?.id && !req.user?.rol_id) {
            throw new error_middleware_1.AppError('Usuario sin autenticación o rol asignado', 403);
        }
        const { permissions, isAdmin, roles } = await (0, permisos_middleware_1.getUsuarioPermisos)(req.user.id, req.user.rol_id);
        if (isAdmin) {
            return next();
        }
        if (['formato_requerimiento_config', 'formato_requerimiento_cambio'].includes(table)) {
            // El formato se consulta al imprimir un requerimiento; sus textos no contienen datos sensibles.
            if (req.method === 'GET')
                return next();
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && permissions.has('configuracion.editar'))
                return next();
            throw new error_middleware_1.AppError('No tienes permisos para administrar el formato de requerimientos', 403);
        }
        // Cualquier usuario autenticado puede LEER todas las tablas (para llenar desplegables)
        if (req.method === 'GET') {
            return next();
        }
        // Validación granular para productos
        if (table === 'producto') {
            if (req.method === 'POST' && !permissions.has('productos.crear')) {
                throw new error_middleware_1.AppError('No tienes permiso para crear productos', 403);
            }
            if (req.method === 'PUT' && !permissions.has('productos.editar')) {
                throw new error_middleware_1.AppError('No tienes permiso para editar productos', 403);
            }
            if (req.method === 'PATCH' && req.path.endsWith('/status')) {
                const { activo } = req.body;
                const requiredPerm = activo ? 'productos.activar' : 'productos.desactivar';
                if (!permissions.has(requiredPerm)) {
                    throw new error_middleware_1.AppError(`No tienes permiso para ${activo ? 'activar' : 'desactivar'} productos`, 403);
                }
            }
            if (req.method === 'DELETE' && !permissions.has('productos.eliminar')) {
                throw new error_middleware_1.AppError('No tienes permiso para eliminar productos', 403);
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
            throw new error_middleware_1.AppError(`No tienes permisos suficientes para modificar ${table}`, 403);
        }
        throw new error_middleware_1.AppError('No tienes permisos para administrar esta tabla', 403);
    }
    catch (error) {
        next(error);
    }
};
// Endpoints exclusivos de administración de Base de Datos
const authorizeAdminOnly = async (req, _res, next) => {
    try {
        if (!req.user?.rol_id)
            throw new error_middleware_1.AppError('Usuario no autenticado', 401);
        const rolRes = await db_1.default.query('SELECT rol_nombre FROM rol WHERE rol_id = $1', [req.user.rol_id]);
        const rol = rolRes.rows[0]?.rol_nombre || '';
        if (rol !== 'admin')
            throw new error_middleware_1.AppError('Acceso exclusivo para administradores', 403);
        next();
    }
    catch (err) {
        next(err);
    }
};
router.get('/database/backup', authorizeAdminOnly, admin_controller_1.adminController.downloadDatabaseBackup);
router.get('/database/backups', authorizeAdminOnly, admin_controller_1.adminController.listDatabaseBackups);
router.post('/database/backups', authorizeAdminOnly, admin_controller_1.adminController.createDatabaseBackup);
router.get('/database/backups/:filename', authorizeAdminOnly, admin_controller_1.adminController.downloadBackupFile);
router.delete('/database/backups/:filename', authorizeAdminOnly, admin_controller_1.adminController.deleteDatabaseBackup);
router.get('/database/stats', authorizeAdminOnly, admin_controller_1.adminController.getDatabaseStats);
router.get('/roles/:rolId/permisos', authorizeCrud, admin_controller_1.adminController.getRolePermissions);
router.post('/roles/:rolId/permisos', authorizeCrud, admin_controller_1.adminController.saveRolePermissions);
router.get('/:table', authorizeCrud, admin_controller_1.adminController.read);
router.post('/:table', authorizeCrud, admin_controller_1.adminController.create);
router.put('/:table/:id', authorizeCrud, admin_controller_1.adminController.update);
router.patch('/:table/:id/status', authorizeCrud, admin_controller_1.adminController.toggleStatus);
router.delete('/:table/:id', authorizeCrud, admin_controller_1.adminController.delete);
exports.default = router;
