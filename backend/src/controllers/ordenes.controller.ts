// backend/src/controllers/ordenes.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { rolesData } from '../models/roles.data';


const obtenerNombreResponsable = (responsableStr: string | null, fallback: string): string => {
  if (!responsableStr) return fallback;
  const parts = responsableStr.split(':');
  const nombreCompleto = parts.length > 1 ? parts[1].trim() : responsableStr.trim();
  
  const nombreParts = nombreCompleto.split(/\s+/).filter(Boolean);
  const primerNombre = nombreParts[0] || '';
  let primerApellido = '';
  if (nombreParts.length > 1) {
    if (nombreParts.length >= 4) {
      primerApellido = nombreParts[2];
    } else {
      primerApellido = nombreParts[1];
    }
  }
  return `${primerNombre} ${primerApellido}`.trim() || fallback;
};

export const ordenesController = {
  // Crear una nueva orden de compra (generada por el rol de Stock / Inventario / Admin)
  crear: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const {
        empresa_id,
        sucursal_id,
        departamento_id,
        centro_costos_id,
        proveedor_id,
        justificacion,
        tipo_articulo,
        negociacion_previa,
        forma_pago,
        plazo_pago,
        tiempo_entrega,
        lugar_recepcion,
        requiere_contrato,
        requiere_seguro,
        requiere_mantenimiento,
        asignado_trabajador,
        trabajador_asignado,
        caracteristicas,
        elaborado_por,
        aprobado_por,
        recibido_por,
        empleado_aprobador_id,
        empleado_receptor_id,
        detalles,
        tipo_compra
      } = req.body;

      if (!justificacion || !detalles || !detalles.length || !empresa_id || !sucursal_id || !departamento_id || !centro_costos_id) {
        throw new AppError('Datos de orden de compra incompletos', 400);
      }

      await client.query('BEGIN');

      // 1. Obtener códigos del departamento y empresa para el secuencial
      const deptRes = await client.query('SELECT departamento_codigo FROM departamento WHERE departamento_id = $1', [departamento_id]);
      const empRes = await client.query('SELECT empresa_codigo FROM empresa WHERE empresa_id = $1', [empresa_id]);

      if (deptRes.rows.length === 0 || empRes.rows.length === 0) {
        throw new AppError('Departamento o Empresa no válidos', 400);
      }

      const deptCode = deptRes.rows[0].departamento_codigo || 'GEN';
      const empCode = empRes.rows[0].empresa_codigo || 'GEN';
      const year = new Date().getFullYear();

      // 2. Calcular secuencial único y progresivo: [num]-DCS-[dept_code]-[empresa_code]-[year]
      const pattern = `%-DCS-${deptCode}-${empCode}-${year}`;
      const seqQuery = await client.query(
        `SELECT orden_compra_codigo 
         FROM orden_compra 
         WHERE orden_compra_codigo LIKE $1`,
        [pattern]
      );

      let maxSeq = 0;
      seqQuery.rows.forEach(r => {
        const parts = r.orden_compra_codigo.split('-');
        const num = parseInt(parts[0], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      });

      const nextSeqNum = maxSeq === 0 ? 1 : maxSeq + 1;
      const seqStr = String(nextSeqNum).padStart(3, '0');
      const codigoOC = `${seqStr}-DCS-${deptCode}-${empCode}-${year}`;

      // Obtener el empleado del usuario actual (Elaborador)
      let empleadoId = req.empleado?.empleado_id;
      if (!empleadoId && req.user?.id) {
        const userRes = await client.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
        empleadoId = userRes.rows[0]?.empleado_id;
      }
      if (!empleadoId) {
        empleadoId = 1;
      }

      // Obtener firma del Elaborador para estamparla inmediatamente
      const empFirmaRes = await client.query('SELECT empleado_firma, empleado_nombre, empleado_apellido FROM empleado WHERE empleado_id = $1', [empleadoId]);
      const firmaElaborador = empFirmaRes.rows[0]?.empleado_firma || null;
      const fechaFirmaElaborador = firmaElaborador ? new Date() : null;
      const elaboradoPorName = empFirmaRes.rows[0] ? `${empFirmaRes.rows[0].empleado_nombre} ${empFirmaRes.rows[0].empleado_apellido}` : elaborado_por;

      const usuarioId = req.user?.id && req.user.id !== 0 ? req.user.id : 1;

      // 3. Insertar la cabecera de la orden de compra
      const ocRes = await client.query(
        `INSERT INTO orden_compra (
           empresa_id, sucursal_id, departamento_id, empleado_id, centro_costos_id, 
           proveedor_id, usuario_id, orden_compra_codigo, orden_compra_justificacion, 
           orden_compra_tipo_articulo, orden_compra_negociacion_previa, orden_compra_forma_pago,
           orden_compra_plazo_pago, orden_compra_tiempo_entrega, orden_compra_lugar_recepcion,
           orden_compra_requiere_contrato, orden_compra_requiere_seguro, orden_compra_requiere_mantenimiento,
           orden_compra_asignado_trabajador, orden_compra_trabajador_asignado, orden_compra_caracteristicas,
           orden_compra_elaborado_por, orden_compra_aprobado_por, orden_compra_recibido_por,
           orden_compra_estado, orden_compra_tipo_compra,
           empleado_aprobador_id, empleado_receptor_id,
           orden_compra_firma_elaborador, orden_compra_fecha_firma_elaborador
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'pendiente', $25, $26, $27, $28, $29) 
         RETURNING orden_compra_id`,
        [
          empresa_id,
          sucursal_id,
          departamento_id,
          empleadoId,
          centro_costos_id,
          proveedor_id || null,
          usuarioId,
          codigoOC,
          justificacion.trim(),
          tipo_articulo || 'OTROS',
          negociacion_previa || 'NO',
          forma_pago || null,
          plazo_pago || null,
          tiempo_entrega || null,
          lugar_recepcion || null,
          requiere_contrato || false,
          requiere_seguro || false,
          requiere_mantenimiento || false,
          asignado_trabajador || false,
          trabajador_asignado || null,
          caracteristicas || null,
          elaboradoPorName || null,
          aprobado_por || null,
          recibido_por || null,
          tipo_compra || 'LOCAL',
          empleado_aprobador_id || null,
          empleado_receptor_id || null,
          firmaElaborador,
          fechaFirmaElaborador
        ]
      );
      const ocId = ocRes.rows[0].orden_compra_id;

      // 4. Insertar los detalles
      for (const d of detalles) {
        let productoNombre = d.descripcion;
        if (d.producto_id) {
          const prodRes = await client.query('SELECT producto_nombre FROM producto WHERE producto_id = $1', [d.producto_id]);
          if (prodRes.rows.length > 0) {
            productoNombre = prodRes.rows[0].producto_nombre;
          }
        }

        await client.query(
          `INSERT INTO orden_compra_detalle (
             orden_compra_id, producto_id, proveedor_id, orden_compra_detalle_descripcion, 
             orden_compra_detalle_cantidad, orden_compra_detalle_unidad_medida,
             orden_compra_detalle_precio_unitario, orden_compra_detalle_subtotal,
             orden_compra_detalle_foto, orden_compra_detalle_negociacion_previa,
             orden_compra_detalle_incluye_iva,
             orden_compra_detalle_comentario
           ) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            ocId,
            d.producto_id || null,
            d.proveedor_id || null,
            productoNombre || 'Artículo de Consumo',
            d.cantidad,
            d.unidad_medida || 'Unidad',
            d.precio_unitario || 0,
            d.subtotal || 0,
            d.foto || null,
            d.negociacion_previa || 'NO',
            d.incluye_iva === undefined ? true : !!d.incluye_iva,
            d.comentario || null
          ]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          id: ocId,
          codigo: codigoOC
        },
        message: 'Orden de compra generada exitosamente'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear orden de compra', 500);
    } finally {
      client.release();
    }
  },

  // Obtener el detalle completo de una orden específica
  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const ocRes = await pool.query(
        `SELECT oc.*, 
                emp.empresa_nombre_comercial, emp.empresa_ruc, emp.empresa_logo,
                suc.sucursal_nombre,
                dept.departamento_nombre, dept.departamento_codigo,
                cc.centro_costos_nombre, cc.centro_costos_codigo,
                p.proveedor_nombre, p.proveedor_codigo,
                u.usuario_nombre,
                emp_req.empleado_nombre || ' ' || emp_req.empleado_apellido AS empleado_nombre_completo,
                emp_req.empleado_cargo,
                emp_aprob.empleado_nombre || ' ' || emp_aprob.empleado_apellido AS aprobador_nombre_completo,
                emp_recib.empleado_nombre || ' ' || emp_recib.empleado_apellido AS recibidor_nombre_completo
         FROM orden_compra oc
         LEFT JOIN empresa emp ON oc.empresa_id = emp.empresa_id
         LEFT JOIN sucursal suc ON oc.sucursal_id = suc.sucursal_id
         LEFT JOIN departamento dept ON oc.departamento_id = dept.departamento_id
         LEFT JOIN centro_costos cc ON oc.centro_costos_id = cc.centro_costos_id
         LEFT JOIN proveedor p ON oc.proveedor_id = p.proveedor_id
         LEFT JOIN usuario u ON oc.usuario_id = u.usuario_id
         LEFT JOIN empleado emp_req ON oc.empleado_id = emp_req.empleado_id
         LEFT JOIN empleado emp_aprob ON oc.empleado_aprobador_id = emp_aprob.empleado_id
         LEFT JOIN empleado emp_recib ON oc.empleado_receptor_id = emp_recib.empleado_id
         WHERE oc.orden_compra_id = $1`,
        [id]
      );

      if (ocRes.rows.length === 0) {
        throw new AppError('Orden de compra no encontrada', 404);
      }

      const row = ocRes.rows[0];

      const detailsRes = await pool.query(
        `SELECT ocd.*, prod.producto_nombre, prod.producto_codigo, prod.producto_foto
         FROM orden_compra_detalle ocd
         LEFT JOIN producto prod ON ocd.producto_id = prod.producto_id
         WHERE ocd.orden_compra_id = $1
         ORDER BY ocd.orden_compra_detalle_id ASC`,
        [id]
      );

      const facturasRes = await pool.query(
        `SELECT factura_codigo FROM orden_compra_factura WHERE orden_compra_id = $1`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...row,
          detalles: detailsRes.rows,
          facturas: facturasRes.rows.map((f: any) => f.factura_codigo)
        }
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al obtener el detalle de la orden de compra', 500);
    }
  },

  // Obtener el siguiente secuencial estimado antes de crear la orden
  getSiguienteSecuencial: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { departamento_id, empresa_id } = req.query;

      if (!departamento_id || !empresa_id) {
        throw new AppError('Faltan departamento_id o empresa_id', 400);
      }

      // Obtener códigos
      const deptRes = await pool.query('SELECT departamento_codigo FROM departamento WHERE departamento_id = $1', [departamento_id]);
      const empRes = await pool.query('SELECT empresa_codigo FROM empresa WHERE empresa_id = $1', [empresa_id]);

      if (deptRes.rows.length === 0 || empRes.rows.length === 0) {
        throw new AppError('Departamento o Empresa no encontrados', 404);
      }

      const deptCode = deptRes.rows[0].departamento_codigo || 'GEN';
      const empCode = empRes.rows[0].empresa_codigo || 'GEN';
      const year = new Date().getFullYear();
      const pattern = `%-DCS-${deptCode}-${empCode}-${year}`;

      const seqQuery = await pool.query(
        `SELECT orden_compra_codigo 
         FROM orden_compra 
         WHERE orden_compra_codigo LIKE $1`,
        [pattern]
      );

      let maxSeq = 0;
      seqQuery.rows.forEach(r => {
        const parts = r.orden_compra_codigo.split('-');
        const num = parseInt(parts[0], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      });

      const nextSeqNum = maxSeq === 0 ? 1 : maxSeq + 1;
      const seqStr = String(nextSeqNum).padStart(3, '0');
      const codigoOC = `${seqStr}-DCS-${deptCode}-${empCode}-${year}`;

      res.json({
        success: true,
        data: {
          codigo: codigoOC,
          secuencial: nextSeqNum
        }
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al calcular el siguiente secuencial', 500);
    }
  },

  // Obtener todas las órdenes de compra
  getAll: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ocRes = await pool.query(
        `SELECT oc.*, p.proveedor_nombre, u.usuario_nombre,
                emp.empresa_nombre_comercial,
                dept.departamento_nombre,
                emp_req.empleado_nombre || ' ' || emp_req.empleado_apellido AS empleado_nombre_completo,
                emp_aprob.empleado_nombre || ' ' || emp_aprob.empleado_apellido AS aprobador_nombre_completo,
                emp_recib.empleado_nombre || ' ' || emp_recib.empleado_apellido AS recibidor_nombre_completo
         FROM orden_compra oc
         LEFT JOIN proveedor p ON oc.proveedor_id = p.proveedor_id
         LEFT JOIN usuario u ON oc.usuario_id = u.usuario_id
         LEFT JOIN empresa emp ON oc.empresa_id = emp.empresa_id
         LEFT JOIN departamento dept ON oc.departamento_id = dept.departamento_id
         LEFT JOIN empleado emp_req ON oc.empleado_id = emp_req.empleado_id
         LEFT JOIN empleado emp_aprob ON oc.empleado_aprobador_id = emp_aprob.empleado_id
         LEFT JOIN empleado emp_recib ON oc.empleado_receptor_id = emp_recib.empleado_id
         ORDER BY oc.orden_compra_fecha_solicitud DESC`
      );

      const items = [];
      for (const row of ocRes.rows) {
        const detailsRes = await pool.query(
          `SELECT ocd.*, prod.producto_nombre, prod.producto_codigo
           FROM orden_compra_detalle ocd
           LEFT JOIN producto prod ON ocd.producto_id = prod.producto_id
           WHERE ocd.orden_compra_id = $1`,
          [row.orden_compra_id]
        );

        const facturasRes = await pool.query(
          `SELECT factura_codigo FROM orden_compra_factura WHERE orden_compra_id = $1`,
          [row.orden_compra_id]
        );

        items.push({
          id: row.orden_compra_id,
          codigo: row.orden_compra_codigo,
          proveedor_nombre: row.proveedor_nombre || 'General/Varios',
          usuario_nombre: row.usuario_nombre || 'Sistema',
          fecha_solicitud: row.orden_compra_fecha_solicitud,
          justificacion: row.orden_compra_justificacion,
          estado: row.orden_compra_estado,
          empresa_nombre: row.empresa_nombre_comercial,
          departamento_nombre: row.departamento_nombre,
          empleado_nombre: row.empleado_nombre_completo,
          // New signature fields
          empleado_aprobador_id: row.empleado_aprobador_id,
          aprobador_nombre: row.aprobador_nombre_completo,
          empleado_receptor_id: row.empleado_receptor_id,
          recibidor_nombre: row.recibidor_nombre_completo,
          firma_elaborador: row.orden_compra_firma_elaborador,
          fecha_firma_elaborador: row.orden_compra_fecha_firma_elaborador,
          firma_aprobador: row.orden_compra_firma_aprobador,
          fecha_firma_aprobador: row.orden_compra_fecha_firma_aprobador,
          firma_recibido: row.orden_compra_firma_recibido,
          fecha_firma_recibido: row.orden_compra_fecha_firma_recibido,
          facturas: facturasRes.rows.map((f: any) => f.factura_codigo),
          detalles: detailsRes.rows.map(d => ({
            id: d.orden_compra_detalle_id,
            producto_id: d.producto_id,
            producto_nombre: d.producto_nombre || d.orden_compra_detalle_descripcion,
            producto_codigo: d.producto_codigo || 'N/A',
            cantidad: d.orden_compra_detalle_cantidad,
            precio_unitario: d.orden_compra_detalle_precio_unitario,
            subtotal: d.orden_compra_detalle_subtotal,
            incluye_iva: d.orden_compra_detalle_incluye_iva !== false
          }))
        });
      }

      res.json({
        success: true,
        data: items
      });
      return;
    } catch (error) {
      throw new AppError('Error al obtener órdenes de compra', 500);
    }
  },

  // Cambiar estado a entregado y actualizar stock e inventario
  entregar: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { facturas } = req.body;

      if (!req.user) {
        throw new AppError('No autenticado', 401);
      }

      // 1. Validar rol del usuario (ADMIN, GUARDIA, INVENTARIO)
      const userRole = rolesData.find(r => r.id === req.user!.rol_id);
      if (!userRole || !['admin', 'guardia', 'inventario'].includes(userRole.nombre)) {
        throw new AppError('No tienes permisos para realizar esta acción. Solo ADMIN, GUARDIA y INVENTARIO están autorizados.', 403);
      }

      if (!facturas || !Array.isArray(facturas) || facturas.length === 0) {
        throw new AppError('Debe ingresar al menos un código de factura', 400);
      }

      // Validar que las facturas no estén vacías
      const cleanFacturas = facturas.map((f: any) => String(f).trim()).filter(f => f.length > 0);
      if (cleanFacturas.length === 0) {
        throw new AppError('Los códigos de factura no pueden estar vacíos', 400);
      }

      await client.query('BEGIN');

      // 2. Obtener el requerimiento
      const ocRes = await client.query(
        `SELECT * FROM orden_compra WHERE orden_compra_id = $1 FOR UPDATE`,
        [id]
      );

      if (ocRes.rows.length === 0) {
        throw new AppError('Requerimiento no encontrado', 404);
      }

      const oc = ocRes.rows[0];

      if (oc.orden_compra_estado === 'entregado') {
        throw new AppError('El requerimiento ya ha sido entregado', 400);
      }

      if (oc.orden_compra_estado === 'cancelada') {
        throw new AppError('No se puede entregar un requerimiento cancelado', 400);
      }

      // 2.1. Validar que el requerimiento esté firmado por todas las partes
      if (!oc.orden_compra_firma_elaborador || !oc.orden_compra_firma_aprobador || !oc.orden_compra_firma_recibido) {
        const faltantes = [];
        if (!oc.orden_compra_firma_elaborador) {
          faltantes.push(obtenerNombreResponsable(oc.orden_compra_elaborado_por, 'Elaborador'));
        }
        if (!oc.orden_compra_firma_aprobador) {
          faltantes.push(obtenerNombreResponsable(oc.orden_compra_aprobado_por, 'Aprobador'));
        }
        if (!oc.orden_compra_firma_recibido) {
          faltantes.push(obtenerNombreResponsable(oc.orden_compra_recibido_por, 'Receptor'));
        }
        throw new AppError(`El requerimiento no puede ser recibido: falta la firma de ${faltantes.join(', ')}.`, 400);
      }

      // 3. Registrar códigos de factura
      for (const facCodigo of cleanFacturas) {
        await client.query(
          `INSERT INTO orden_compra_factura (orden_compra_id, factura_codigo) VALUES ($1, $2)`,
          [id, facCodigo]
        );
      }

      // 4. Sumar los productos al stock del sistema y registrar movimientos de inventario
      const detailsRes = await client.query(
        `SELECT * FROM orden_compra_detalle WHERE orden_compra_id = $1`,
        [id]
      );

      for (const d of detailsRes.rows) {
        if (d.producto_id) {
          // Obtener el stock actual con bloqueo
          const prodRes = await client.query(
            `SELECT producto_stock FROM producto WHERE producto_id = $1 FOR UPDATE`,
            [d.producto_id]
          );

          if (prodRes.rows.length > 0) {
            const stockAnterior = prodRes.rows[0].producto_stock;
            const stockNuevo = stockAnterior + d.orden_compra_detalle_cantidad;

            // Actualizar stock del producto
            await client.query(
              `UPDATE producto SET producto_stock = $1, producto_fecha_modificacion = CURRENT_TIMESTAMP WHERE producto_id = $2`,
              [stockNuevo, d.producto_id]
            );

            // Registrar movimiento de inventario
            const obs = `Recepción de requerimiento ${oc.orden_compra_codigo} - Factura: ${cleanFacturas.join(', ')}`;
            await client.query(
              `INSERT INTO movimiento_inventario (
                producto_id, sucursal_id, usuario_id, movimiento_inventario_tipo,
                movimiento_inventario_cantidad, movimiento_inventario_stock_anterior,
                movimiento_inventario_stock_nuevo, movimiento_inventario_observacion,
                orden_compra_id
              ) VALUES ($1, $2, $3, 'orden_compra', $4, $5, $6, $7, $8)`,
              [
                d.producto_id,
                oc.sucursal_id,
                req.user.id && req.user.id !== 0 ? req.user.id : 1,
                d.orden_compra_detalle_cantidad,
                stockAnterior,
                stockNuevo,
                obs,
                id
              ]
            );
          }
        }
      }

      // 5. Actualizar estado del requerimiento
      await client.query(
        `UPDATE orden_compra 
         SET orden_compra_estado = 'entregado', 
             orden_compra_fecha_recepcion = CURRENT_TIMESTAMP,
             usuario_receptor_id = $1,
             orden_compra_fecha_modificacion = CURRENT_TIMESTAMP
         WHERE orden_compra_id = $2`,
        [req.user.id && req.user.id !== 0 ? req.user.id : 1, id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Requerimiento recibido e inventario actualizado con éxito'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al procesar la entrega del requerimiento', 500);
    } finally {
      client.release();
    }
  },

  // Eliminar orden de reabastecimiento (Solo para rol Admin)
  eliminar: async (req: AuthRequest, res: Response): Promise<void> => {
    // El rol_id de admin en base de datos/rolesData es 1
    if (req.user?.rol_id !== 1) {
      throw new AppError('Acceso denegado. Solo administradores pueden eliminar órdenes.', 403);
    }

    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validar que la orden existe
      const ocRes = await client.query('SELECT * FROM orden_compra WHERE orden_compra_id = $1', [id]);
      if (ocRes.rows.length === 0) {
        throw new AppError('La orden de reabastecimiento no existe', 404);
      }

      // 2. Eliminar detalles de la orden
      await client.query('DELETE FROM orden_compra_detalle WHERE orden_compra_id = $1', [id]);

      // 3. Eliminar cabecera de la orden
      await client.query('DELETE FROM orden_compra WHERE orden_compra_id = $1', [id]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Orden de reabastecimiento eliminada correctamente.'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al eliminar la orden de reabastecimiento', 500);
    } finally {
      client.release();
    }
  },

  // Firmar orden de compra (Aprobador o Receptor)
  firmar: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Obtener el empleado del usuario actual
      let empleadoId = req.empleado?.empleado_id;
      if (!empleadoId && req.user?.id) {
        const userRes = await pool.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
        empleadoId = userRes.rows[0]?.empleado_id;
      }
      
      if (!empleadoId) {
        throw new AppError('No estás registrado como empleado. No puedes firmar este documento.', 403);
      }

      // Obtener la firma del empleado
      const empRes = await pool.query('SELECT empleado_firma, empleado_nombre, empleado_apellido FROM empleado WHERE empleado_id = $1', [empleadoId]);
      const empleado = empRes.rows[0];
      if (!empleado || !empleado.empleado_firma) {
        throw new AppError('No tienes una firma registrada. Por favor, solicita al Administrador que suba tu firma.', 400);
      }

      // Obtener el requerimiento
      const ocRes = await pool.query('SELECT * FROM orden_compra WHERE orden_compra_id = $1', [id]);
      const oc = ocRes.rows[0];
      if (!oc) {
        throw new AppError('El requerimiento no existe', 404);
      }

      const isAprobador = oc.empleado_aprobador_id === empleadoId;
      const isReceptor = oc.empleado_receptor_id === empleadoId;

      if (!isAprobador && !isReceptor) {
        throw new AppError('No estás autorizado para firmar este requerimiento.', 403);
      }

      const signatureDate = new Date();
      const empleadoNombreCompleto = `${empleado.empleado_nombre} ${empleado.empleado_apellido}`;

      if (isAprobador) {
        if (oc.orden_compra_estado !== 'pendiente') {
          throw new AppError('El requerimiento no está en estado pendiente de aprobación.', 400);
        }
        await pool.query(
          `UPDATE orden_compra 
           SET orden_compra_firma_aprobador = $1, 
               orden_compra_fecha_firma_aprobador = $2, 
               orden_compra_aprobado_por = $3,
               orden_compra_estado = 'aprobada',
               orden_compra_fecha_aprobacion = $2,
               orden_compra_fecha_modificacion = CURRENT_TIMESTAMP
           WHERE orden_compra_id = $4`,
          [empleado.empleado_firma, signatureDate, empleadoNombreCompleto, id]
        );
      } else if (isReceptor) {
        if (oc.orden_compra_estado !== 'aprobada') {
          throw new AppError('El requerimiento debe estar aprobado antes de ser recibido.', 400);
        }
        await pool.query(
          `UPDATE orden_compra 
           SET orden_compra_firma_recibido = $1, 
               orden_compra_fecha_firma_recibido = $2, 
               orden_compra_recibido_por = $3,
               orden_compra_estado = 'recibida',
               orden_compra_fecha_modificacion = CURRENT_TIMESTAMP
           WHERE orden_compra_id = $4`,
          [empleado.empleado_firma, signatureDate, empleadoNombreCompleto, id]
        );
      }

      res.json({
        success: true,
        message: 'Requerimiento firmado exitosamente.'
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al firmar requerimiento', 500);
    }
  }
};
