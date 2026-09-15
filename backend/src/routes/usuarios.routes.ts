// backend/src/routes/usuarios.routes.ts
import { Router } from 'express';
import { usuariosController } from '../controllers/usuarios.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

// Ver operadores y roles disponibles para asignar
router.get('/', requireAnyPermission('usuarios.ver', 'usuarios.crear'), usuariosController.getAll);
router.get('/roles', requireAnyPermission('usuarios.ver', 'usuarios.crear'), usuariosController.getRoles);

// Crear, editar y eliminar operadores
router.post('/', requirePermission('usuarios.crear'), usuariosController.create);
router.put('/:id', requirePermission('usuarios.editar'), usuariosController.update);
router.patch('/:id/requerir-cambio-password', requirePermission('usuarios.editar'), usuariosController.requirePasswordChange);
router.delete('/:id', requirePermission('usuarios.eliminar'), usuariosController.delete);

// Permisos individuales por usuario
router.get('/:id/permisos', requireAnyPermission('roles.ver', 'roles.crear', 'usuarios.editar'), usuariosController.getUserPermissions);
router.post('/:id/permisos', requireAnyPermission('roles.crear', 'usuarios.editar'), usuariosController.saveUserPermissions);

export default router;
