"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/empleados.routes.ts
const express_1 = require("express");
const empleados_controller_1 = require("../controllers/empleados.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.authenticate);
// GET /api/empleados - Ver todos los empleados
router.get('/', (0, permisos_middleware_1.requirePermission)('empleados.ver'), empleados_controller_1.empleadosController.getAll);
// GET /api/empleados/departamentos
router.get('/departamentos', empleados_controller_1.empleadosController.getDepartamentos);
// GET /api/empleados/centros-costos
router.get('/centros-costos', empleados_controller_1.empleadosController.getCentrosCostos);
// GET /api/empleados/:id - Ver un empleado específico
router.get('/:id', (0, permisos_middleware_1.requireSelfOrPermission)('empleados.ver_datos_sensibles'), empleados_controller_1.empleadosController.getById);
// GET /api/empleados/:id/historial - Ver historial de compras
// Permite: empleados.ver_historial_compras O ser el mismo empleado
router.get('/:id/historial', (0, permisos_middleware_1.requireSelfOrPermission)('empleados.ver_historial_compras'), empleados_controller_1.empleadosController.getHistorialCompras);
// POST /api/empleados - Crear empleado
// Requiere: empleados.crear
router.post('/', (0, permisos_middleware_1.requirePermission)('empleados.crear'), empleados_controller_1.empleadosController.create);
// PUT /api/empleados/:id - Editar empleado
// Requiere: empleados.editar
router.put('/:id', (0, permisos_middleware_1.requirePermission)('empleados.editar'), empleados_controller_1.empleadosController.update);
// DELETE /api/empleados/:id - Eliminar empleado
// Requiere: empleados.eliminar
router.delete('/:id', (0, permisos_middleware_1.requirePermission)('empleados.eliminar'), empleados_controller_1.empleadosController.delete);
exports.default = router;
