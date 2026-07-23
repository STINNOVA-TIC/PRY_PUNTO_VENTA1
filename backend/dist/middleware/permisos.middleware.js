"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSelfOrPermission = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = void 0;
const roles_data_1 = require("../models/roles.data");
// Verificar si el usuario tiene un permiso específico
const requirePermission = (permiso) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
            return;
        }
        const userRole = roles_data_1.rolesData.find(r => r.id === req.user.rol_id);
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
exports.requirePermission = requirePermission;
// Verificar si el usuario tiene ALGUNO de los permisos
const requireAnyPermission = (...permisos) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
            return;
        }
        const userRole = roles_data_1.rolesData.find(r => r.id === req.user.rol_id);
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
exports.requireAnyPermission = requireAnyPermission;
// Verificar si el usuario tiene TODOS los permisos
const requireAllPermissions = (...permisos) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
            return;
        }
        const userRole = roles_data_1.rolesData.find(r => r.id === req.user.rol_id);
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
exports.requireAllPermissions = requireAllPermissions;
// Middleware para verificar que un usuario puede acceder a sus propios datos o a los de otros
const requireSelfOrPermission = (permiso) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
            return;
        }
        const userRole = roles_data_1.rolesData.find(r => r.id === req.user.rol_id);
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
exports.requireSelfOrPermission = requireSelfOrPermission;
