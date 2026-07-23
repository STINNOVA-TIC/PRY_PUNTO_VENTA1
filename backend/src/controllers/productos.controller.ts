// backend/src/controllers/productos.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const productosController = {
  // Obtener todos los productos
  getAll: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const prodRes = await pool.query(
        "SELECT * FROM producto WHERE producto_estado = 'activo' ORDER BY producto_nombre ASC"
      );

      const items = prodRes.rows.map(row => ({
        id: row.producto_id,
        codigo_barras: row.producto_codigo,
        nombre: row.producto_nombre,
        descripcion: row.producto_descripcion || '',
        precio_costo: parseFloat(row.producto_precio_compra || '0'),
        precio_venta: parseFloat(row.producto_precio || '0'),
        stock_actual: row.producto_stock,
        stock_minimo: 5,
        categoria_id: row.categoria_id,
        proveedor_id: row.proveedor_id,
        foto: row.producto_foto || 'https://images.unsplash.com/photo-1546241072-48010ad2862c?auto=format&fit=crop&w=400&q=80',
        activo: row.producto_estado === 'activo'
      }));

      res.json({
        success: true,
        data: items
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener productos', 500);
    }
  },

  // Obtener producto por ID
  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const prodRes = await pool.query("SELECT * FROM producto WHERE producto_id = $1", [id]);
      const row = prodRes.rows[0];

      if (!row) {
        throw new AppError('Producto no encontrado', 404);
      }

      res.json({
        success: true,
        data: {
          id: row.producto_id,
          codigo_barras: row.producto_codigo,
          nombre: row.producto_nombre,
          descripcion: row.producto_descripcion || '',
          precio_costo: parseFloat(row.producto_precio_compra || '0'),
          precio_venta: parseFloat(row.producto_precio || '0'),
          stock_actual: row.producto_stock,
          stock_minimo: 5,
          categoria_id: row.categoria_id,
          proveedor_id: row.proveedor_id,
          foto: row.producto_foto || 'https://images.unsplash.com/photo-1546241072-48010ad2862c?auto=format&fit=crop&w=400&q=80',
          activo: row.producto_estado === 'activo'
        }
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al obtener producto', 500);
    }
  },

  // Crear un nuevo producto
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { 
        codigo_barras, 
        nombre, 
        descripcion, 
        precio_costo, 
        precio_venta, 
        stock_actual, 
        categoria_id, 
        proveedor_id, 
        foto 
      } = req.body;

      if (!codigo_barras || !nombre || !precio_venta || !stock_actual) {
        throw new AppError('Datos incompletos para crear el producto', 400);
      }

      // Obtener primera categoria y proveedor si no se especificaron
      let catId = categoria_id;
      if (!catId) {
        const catRes = await pool.query('SELECT categoria_id FROM categoria LIMIT 1');
        catId = catRes.rows[0]?.categoria_id;
      }
      let provId = proveedor_id;
      if (!provId) {
        const provRes = await pool.query('SELECT proveedor_id FROM proveedor LIMIT 1');
        provId = provRes.rows[0]?.proveedor_id;
      }

      const defaultFoto = foto || 'https://images.unsplash.com/photo-1546241072-48010ad2862c?auto=format&fit=crop&w=400&q=80';

      const insertRes = await pool.query(
        `INSERT INTO producto (categoria_id, proveedor_id, producto_codigo, producto_nombre, producto_descripcion, producto_precio, producto_precio_compra, producto_stock, producto_foto, producto_estado) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'activo') 
         RETURNING *`,
        [catId, provId, codigo_barras.trim(), nombre.trim(), descripcion || '', parseFloat(precio_venta), parseFloat(precio_costo || '0'), parseInt(stock_actual), defaultFoto]
      );

      res.status(201).json({
        success: true,
        data: insertRes.rows[0],
        message: 'Producto creado exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear producto en base de datos', 500);
    }
  },

  // Modificar stock de un producto
  updateStock: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { stock } = req.body;

      if (stock === undefined || isNaN(parseInt(stock))) {
        throw new AppError('El valor del stock es inválido', 400);
      }

      const updateRes = await pool.query(
        'UPDATE producto SET producto_stock = $1 WHERE producto_id = $2 RETURNING *',
        [parseInt(stock), id]
      );

      if (updateRes.rows.length === 0) {
        throw new AppError('Producto no encontrado', 404);
      }

      res.json({
        success: true,
        data: updateRes.rows[0],
        message: 'Stock actualizado exitosamente'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al modificar stock', 500);
    }
  },

  getCategorias: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const catRes = await pool.query("SELECT categoria_id as id, categoria_nombre as nombre FROM categoria WHERE categoria_estado = 'activo' ORDER BY categoria_nombre ASC");
      res.json({ success: true, data: catRes.rows });
    } catch (error) {
      throw new AppError('Error al obtener categorías', 500);
    }
  },

  getProveedores: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const provRes = await pool.query("SELECT proveedor_id as id, proveedor_nombre as nombre FROM proveedor WHERE proveedor_estado = 'activo' ORDER BY proveedor_nombre ASC");
      res.json({ success: true, data: provRes.rows });
    } catch (error) {
      throw new AppError('Error al obtener proveedores', 500);
    }
  }
};