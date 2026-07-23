import { roles } from '../models/data.js';
export const requireRole = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userRole = roles.find(r => r.id === req.user.rol_id);
        if (!userRole || !rolesPermitidos.includes(userRole.nombre)) {
            return res.status(403).json({
                message: 'No tienes permisos para realizar esta acción',
                required: rolesPermitidos,
                current: userRole?.nombre
            });
        }
        next();
    };
};
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userRole = roles.find(r => r.id === req.user.rol_id);
        if (!userRole || !userRole.permisos[permission]) {
            return res.status(403).json({
                message: 'No tienes permiso para realizar esta acción',
                requiredPermission: permission
            });
        }
        next();
    };
};
