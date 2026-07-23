// backend/src/routes/usuarios.routes.ts
import { Router } from 'express';
import { usuariosController } from '../controllers/usuarios.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

// Solo el rol de Administrador puede administrar operadores del sistema
router.get('/', requirePermission('empleados.crear'), usuariosController.getAll);
router.get('/roles', requirePermission('empleados.crear'), usuariosController.getRoles);
router.post('/', requirePermission('empleados.crear'), usuariosController.create);
router.put('/:id', requirePermission('empleados.crear'), usuariosController.update);
router.delete('/:id', requirePermission('empleados.crear'), usuariosController.delete);

export default router;
