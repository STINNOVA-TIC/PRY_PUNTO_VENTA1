"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/usuarios.routes.ts
const express_1 = require("express");
const usuarios_controller_1 = require("../controllers/usuarios.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Ver operadores y roles disponibles para asignar
router.get('/', (0, permisos_middleware_1.requireAnyPermission)('usuarios.ver', 'usuarios.crear'), usuarios_controller_1.usuariosController.getAll);
router.get('/roles', (0, permisos_middleware_1.requireAnyPermission)('usuarios.ver', 'usuarios.crear'), usuarios_controller_1.usuariosController.getRoles);
// Crear, editar y eliminar operadores
router.post('/', (0, permisos_middleware_1.requirePermission)('usuarios.crear'), usuarios_controller_1.usuariosController.create);
router.put('/:id', (0, permisos_middleware_1.requirePermission)('usuarios.editar'), usuarios_controller_1.usuariosController.update);
router.delete('/:id', (0, permisos_middleware_1.requirePermission)('usuarios.eliminar'), usuarios_controller_1.usuariosController.delete);
// Permisos individuales por usuario
router.get('/:id/permisos', (0, permisos_middleware_1.requireAnyPermission)('roles.ver', 'roles.crear', 'usuarios.editar'), usuarios_controller_1.usuariosController.getUserPermissions);
router.post('/:id/permisos', (0, permisos_middleware_1.requireAnyPermission)('roles.crear', 'usuarios.editar'), usuarios_controller_1.usuariosController.saveUserPermissions);
exports.default = router;
