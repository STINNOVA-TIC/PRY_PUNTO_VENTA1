"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/entregas.routes.ts
const express_1 = require("express");
const entregas_controller_1 = require("../controllers/entregas.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/entregas
 * Obtener todas las solicitudes de entrega
 * Permisos: entregas.ver (admin, guardia, inventario)
 * Empleados: solo ven sus propias solicitudes
 */
router.get('/', (0, permisos_middleware_1.requirePermission)('entregas.ver'), entregas_controller_1.entregasController.getAll);
/**
 * GET /api/entregas/pendientes
 * Obtener solicitudes pendientes (para guardia)
 * Permisos: entregas.ver_pendientes
 */
router.get('/pendientes', (0, permisos_middleware_1.requirePermission)('entregas.ver_pendientes'), entregas_controller_1.entregasController.getPendientes);
/**
 * GET /api/entregas/estadisticas
 * Obtener estadísticas de entregas
 * Permisos: reportes.ver
 */
router.get('/estadisticas', (0, permisos_middleware_1.requirePermission)('reportes.ver'), entregas_controller_1.entregasController.getEstadisticas);
/**
 * GET /api/entregas/:id
 * Obtener una solicitud específica
 * Permisos: entregas.ver O ser el empleado propietario
 */
router.get('/:id', (0, permisos_middleware_1.requirePermission)('entregas.ver'), entregas_controller_1.entregasController.getById);
/**
 * POST /api/entregas/confirmar
 * Confirmar entrega de producto
 * Permisos: entregas.confirmar
 */
router.post('/confirmar', (0, permisos_middleware_1.requirePermission)('entregas.confirmar'), entregas_controller_1.entregasController.confirmar);
/**
 * PUT /api/entregas/:id/cancelar
 * Cancelar una solicitud de entrega
 * Permisos: entregas.confirmar
 */
router.put('/:id/cancelar', (0, permisos_middleware_1.requirePermission)('entregas.confirmar'), entregas_controller_1.entregasController.cancelar);
/**
 * POST /api/entregas/:id/incidente
 * Reportar incidente en verificación
 * Permisos: entregas.reportar_incidente
 */
router.post('/:id/incidente', (0, permisos_middleware_1.requirePermission)('entregas.reportar_incidente'), entregas_controller_1.entregasController.reportarIncidente);
router.patch('/:id/no-entregado', (0, permisos_middleware_1.requirePermission)('entregas.confirmar'), entregas_controller_1.entregasController.marcarNoEntregado);
exports.default = router;
