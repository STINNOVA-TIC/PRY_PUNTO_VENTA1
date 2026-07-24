"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/productos.routes.ts
const express_1 = require("express");
const productos_controller_1 = require("../controllers/productos.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', (0, permisos_middleware_1.requirePermission)('productos.ver'), productos_controller_1.productosController.getAll);
router.get('/categorias', (0, permisos_middleware_1.requirePermission)('productos.ver'), productos_controller_1.productosController.getCategorias);
router.get('/proveedores', (0, permisos_middleware_1.requirePermission)('productos.ver'), productos_controller_1.productosController.getProveedores);
router.get('/:id', (0, permisos_middleware_1.requirePermission)('productos.ver'), productos_controller_1.productosController.getById);
router.post('/', (0, permisos_middleware_1.requirePermission)('productos.crear'), productos_controller_1.productosController.create);
router.post('/import', (0, permisos_middleware_1.requirePermission)('productos.importar'), productos_controller_1.productosController.importBulk);
exports.default = router;
