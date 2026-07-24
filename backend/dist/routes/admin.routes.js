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
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
const authorizeCrud = async (req, _res, next) => {
    try {
        const { table } = req.params;
        if (!req.user?.rol_id) {
            throw new error_middleware_1.AppError('Usuario sin rol asignado', 403);
        }
        const rolRes = await db_1.default.query('SELECT rol_nombre FROM rol WHERE rol_id = $1', [req.user.rol_id]);
        const rol = rolRes.rows[0]?.rol_nombre || '';
        if (rol === 'admin') {
            return next();
        }
        // Inventario y Guardia pueden LEER todas las tablas (para llenar desplegables)
        if ((rol === 'inventario' || rol === 'guardia') && req.method === 'GET') {
            return next();
        }
        // Inventario puede hacer CRUD completo (escribir) a productos, proveedor y categoría
        if (rol === 'inventario' && ['producto', 'proveedor', 'categoria'].includes(table)) {
            return next();
        }
        throw new error_middleware_1.AppError('No tienes permisos para administrar esta tabla', 403);
    }
    catch (error) {
        next(error);
    }
};
router.get('/:table', authorizeCrud, admin_controller_1.adminController.read);
router.post('/:table', authorizeCrud, admin_controller_1.adminController.create);
router.put('/:table/:id', authorizeCrud, admin_controller_1.adminController.update);
router.patch('/:table/:id/status', authorizeCrud, admin_controller_1.adminController.toggleStatus);
exports.default = router;
