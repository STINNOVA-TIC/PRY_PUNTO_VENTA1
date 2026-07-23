"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/usuarios.routes.ts
const express_1 = require("express");
const usuarios_controller_1 = require("../controllers/usuarios.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Solo el rol de Administrador puede administrar operadores del sistema
router.get('/', (0, permisos_middleware_1.requirePermission)('empleados.crear'), usuarios_controller_1.usuariosController.getAll);
router.get('/roles', (0, permisos_middleware_1.requirePermission)('empleados.crear'), usuarios_controller_1.usuariosController.getRoles);
router.post('/', (0, permisos_middleware_1.requirePermission)('empleados.crear'), usuarios_controller_1.usuariosController.create);
router.put('/:id', (0, permisos_middleware_1.requirePermission)('empleados.crear'), usuarios_controller_1.usuariosController.update);
router.delete('/:id', (0, permisos_middleware_1.requirePermission)('empleados.crear'), usuarios_controller_1.usuariosController.delete);
exports.default = router;
