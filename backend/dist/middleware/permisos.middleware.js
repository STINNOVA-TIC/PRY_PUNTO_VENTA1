"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSelfOrPermission = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = void 0;
const roles_data_1 = require("../models/roles.data");
const db_1 = __importDefault(require("../config/db"));
// Helper para obtener la unión de todos los permisos de los roles del usuario
async function getUsuarioPermisos(userId, defaultRolId) {
    const rolesList = [];
    if (userId && userId !== 0) {
        const userRolesRes = await db_1.default.query('SELECT rol_id FROM usuario_rol WHERE usuario_id = $1', [userId]);
        rolesList.push(...userRolesRes.rows.map(r => r.rol_id));
    }
    if (rolesList.length === 0 && defaultRolId) {
        rolesList.push(defaultRolId);
    }
    const matchedRoles = roles_data_1.rolesData.filter(r => rolesList.includes(r.id));
    const allPermisos = new Set();
    let isAdmin = false;
    const rolesNames = [];
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
const requirePermission = (permiso) => {
    return async (req, res, next) => {
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
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requirePermission = requirePermission;
// Verificar si el usuario tiene ALGUNO de los permisos
const requireAnyPermission = (...permisos) => {
    return async (req, res, next) => {
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
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
// Verificar si el usuario tiene TODOS los permisos
const requireAllPermissions = (...permisos) => {
    return async (req, res, next) => {
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
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
// Middleware para verificar que un usuario puede acceder a sus propios datos o a los de otros
const requireSelfOrPermission = (permiso) => {
    return async (req, res, next) => {
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
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requireSelfOrPermission = requireSelfOrPermission;
