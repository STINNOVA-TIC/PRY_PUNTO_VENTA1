"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/ordenes.routes.ts
const express_1 = require("express");
const ordenes_controller_1 = require("../controllers/ordenes.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', (0, permisos_middleware_1.requirePermission)('compras.requerimientos.crear'), ordenes_controller_1.ordenesController.crear);
router.get('/', (0, permisos_middleware_1.requireAnyPermission)('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenes_controller_1.ordenesController.getAll);
router.get('/secuencial/siguiente', (0, permisos_middleware_1.requireAnyPermission)('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenes_controller_1.ordenesController.getSiguienteSecuencial);
router.get('/:id', (0, permisos_middleware_1.requireAnyPermission)('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenes_controller_1.ordenesController.getById);
router.put('/:id/entregar', (0, permisos_middleware_1.requirePermission)('compras.requerimientos.recibir'), ordenes_controller_1.ordenesController.entregar);
router.put('/:id/firmar', (0, permisos_middleware_1.requireAnyPermission)('compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenes_controller_1.ordenesController.firmar);
router.put('/:id', (0, permisos_middleware_1.requirePermission)('compras.requerimientos.editar'), ordenes_controller_1.ordenesController.update);
router.delete('/:id', (0, permisos_middleware_1.requirePermission)('compras.requerimientos.eliminar'), ordenes_controller_1.ordenesController.eliminar);
exports.default = router;
