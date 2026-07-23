"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/devoluciones.routes.ts
const express_1 = require("express");
const devoluciones_controller_1 = require("../controllers/devoluciones.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', (0, permisos_middleware_1.requirePermission)('entregas.ver_pendientes'), devoluciones_controller_1.devolucionesController.solicitar);
router.get('/', (0, permisos_middleware_1.requirePermission)('reportes.ver'), devoluciones_controller_1.devolucionesController.getAll);
router.patch('/:id/aprobar', (0, permisos_middleware_1.requirePermission)('nomina.configurar_descuentos'), devoluciones_controller_1.devolucionesController.aprobar);
router.patch('/:id/rechazar', (0, permisos_middleware_1.requirePermission)('nomina.configurar_descuentos'), devoluciones_controller_1.devolucionesController.rechazar);
exports.default = router;
