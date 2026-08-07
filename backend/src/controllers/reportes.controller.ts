// backend/src/controllers/reportes.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const reportesController = {
  // Reporte consolidado de consumos (con filtros opcionales de fecha)
  getConsumoEmpleados: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      let query = `
        SELECT 
          e.empleado_nombre, 
          e.empleado_apellido, 
          e.empleado_cedula as codigo,
          d.departamento_nombre as departamento,
          cc.centro_costos_codigo,
          COUNT(v.venta_id) as total_compras,
          COALESCE(SUM(v.venta_total), 0) as total_gastado
        FROM empleado e
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
        LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
        LEFT JOIN venta v ON e.empleado_id = v.empleado_id AND v.venta_estado = 'completada'
      `;
      const params: any[] = [];

      if (fecha_inicio && fecha_fin) {
        query += ' AND v.venta_fecha::date BETWEEN $1 AND $2';
        params.push(fecha_inicio, fecha_fin);
      }

      query += `
        GROUP BY e.empleado_id, e.empleado_nombre, e.empleado_apellido, e.empleado_cedula, d.departamento_nombre, cc.centro_costos_codigo
        ORDER BY total_gastado DESC
      `;

      const result = await pool.query(query, params);

      const data = result.rows.map(row => {
        const totalGastado = parseFloat(row.total_gastado);
        const totalCompras = parseInt(row.total_compras);
        return {
          empleado: `${row.empleado_nombre} ${row.empleado_apellido}`,
          codigo: row.codigo,
          departamento: row.departamento || 'Sin Departamento',
          centro_costos: row.centro_costos_codigo || 'N/A',
          total_compras: totalCompras,
          total_gastado: totalGastado,
          promedio: totalCompras > 0 ? totalGastado / totalCompras : 0
        };
      });

      res.json({
        success: true,
        data: data
      });
      return;
    } catch (error) {
      throw new AppError('Error al generar reporte de consumos', 500);
    }
  },

  // Reporte detallado de transacciones
  getTransaccionesDetalladas: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      let query = `
        SELECT 
          v.venta_id,
          v.venta_fecha as fecha,
          v.venta_estado as estado,
          e.empleado_nombre, 
          e.empleado_apellido, 
          e.empleado_cedula as cedula,
          d.departamento_nombre as departamento,
          COALESCE(cc.centro_costos_codigo || ' - ' || cc.centro_costos_nombre, cc.centro_costos_nombre) as centro_costos,
          p.producto_nombre as producto,
          p.producto_codigo as producto_codigo,
          p.producto_descripcion as producto_descripcion,
          c.categoria_nombre as categoria,
          vd.venta_detalle_cantidad as cantidad,
          vd.venta_detalle_precio_unitario as precio_unitario,
          vd.venta_detalle_subtotal as total
        FROM venta v
        JOIN empleado e ON v.empleado_id = e.empleado_id
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
        LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
        JOIN venta_detalle vd ON v.venta_id = vd.venta_id
        JOIN producto p ON vd.producto_id = p.producto_id
        LEFT JOIN categoria c ON p.categoria_id = c.categoria_id
        WHERE v.venta_estado = 'completada'
      `;
      const params: any[] = [];

      if (fecha_inicio && fecha_fin) {
        query += ' AND v.venta_fecha::date BETWEEN $1 AND $2';
        params.push(fecha_inicio, fecha_fin);
      }

      query += ' ORDER BY v.venta_fecha DESC';

      const result = await pool.query(query, params);

      const items = result.rows.map(row => ({
        id: row.venta_id,
        fecha: row.fecha,
        estado: row.estado,
        empleado_nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
        empleado_cedula: row.cedula,
        departamento: row.departamento || 'General',
        centro_costos: row.centro_costos || 'Sin centro',
        producto_nombre: row.producto,
        producto_codigo: row.producto_codigo,
        producto_descripcion: row.producto_descripcion || 'Sin detalle',
        categoria: row.categoria || 'Sin categoría',
        cantidad: parseInt(row.cantidad),
        precio_unitario: parseFloat(row.precio_unitario),
        total: parseFloat(row.total)
      }));

      res.json({
        success: true,
        data: items
      });
      return;
    } catch (error) {
      throw new AppError('Error al generar reporte de transacciones detalladas', 500);
    }
  }
};