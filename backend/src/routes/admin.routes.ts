// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

import pool from '../config/db';

const router = Router();

router.use(authenticate);

const authorizeCrud = async (req: any, _res: any, next: any) => {
  try {
    const { table } = req.params;
    if (!req.user?.rol_id) {
      throw new AppError('Usuario sin rol asignado', 403);
    }

    const rolRes = await pool.query('SELECT rol_nombre FROM rol WHERE rol_id = $1', [req.user.rol_id]);
    const rol = rolRes.rows[0]?.rol_nombre || '';

    if (rol === 'admin') {
      return next();
    }

    // Cualquier usuario autenticado puede LEER todas las tablas (para llenar desplegables)
    if (req.method === 'GET') {
      return next();
    }

    // Inventario puede hacer CRUD completo (escribir) a productos, proveedor y categoría
    if (rol === 'inventario' && ['producto', 'proveedor', 'categoria'].includes(table)) {
      return next();
    }

    throw new AppError('No tienes permisos para administrar esta tabla', 403);
  } catch (error) {
    next(error);
  }
};

router.get('/:table', authorizeCrud, adminController.read);
router.post('/:table', authorizeCrud, adminController.create);
router.put('/:table/:id', authorizeCrud, adminController.update);
router.patch('/:table/:id/status', authorizeCrud, adminController.toggleStatus);
router.delete('/:table/:id', authorizeCrud, adminController.delete);

export default router;
