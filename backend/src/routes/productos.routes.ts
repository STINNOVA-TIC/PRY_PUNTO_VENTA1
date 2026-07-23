// backend/src/routes/productos.routes.ts
import { Router } from 'express';
import { productosController } from '../controllers/productos.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('productos.ver'), productosController.getAll);
router.get('/categorias', requirePermission('productos.ver'), productosController.getCategorias);
router.get('/proveedores', requirePermission('productos.ver'), productosController.getProveedores);
router.get('/:id', requirePermission('productos.ver'), productosController.getById);
router.post('/', requirePermission('productos.crear'), productosController.create);
router.patch('/:id/stock', requirePermission('inventario.ajustar_stock'), productosController.updateStock);

export default router;