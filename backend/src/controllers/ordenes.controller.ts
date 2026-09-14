// backend/src/controllers/ordenes.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { getUsuarioPermisos } from '../middleware/permisos.middleware';


async function getAlcanceHistorial(req: AuthRequest): Promise<{ verTodo: boolean; usuarioId: number; empleadoId: number | null }> {
  const usuarioId = req.user?.id || 0;

  // La sesión por cédula mantiene su alcance personal y nunca obtiene historial global.
  if (req.empleado) {
    return { verTodo: false, usuarioId, empleadoId: req.empleado.empleado_id };
  }

  const { permissions, isAdmin } = await getUsuarioPermisos(usuarioId, req.user?.rol_id || 3);
  const empleadoRes = await pool.query(
    'SELECT empleado_id FROM usuario WHERE usuario_id = $1',
    [usuarioId]
  );

  return {
    verTodo: isAdmin || permissions.has('compras.requerimientos.ver_todos'),
    usuarioId,
    empleadoId: empleadoRes.rows[0]?.empleado_id || null
  };
}

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

      // Defensa adicional: la creación es exclusivamente una capacidad corporativa.
      const isUserAdmin = req.user?.rol_id === 1;
      if (!isUserAdmin) {
        const firmasCheck = await client.query(
          `SELECT 1
           FROM usuario u
           WHERE (u.usuario_id = $1 OR u.empleado_id = $2)
             AND u.usuario_estado = 'activo'
             AND EXISTS (
               SELECT 1
               FROM permiso p
               LEFT JOIN usuario_permiso up
                 ON up.permiso_id = p.permiso_id AND up.usuario_id = u.usuario_id
               LEFT JOIN usuario_rol ur ON ur.usuario_id = u.usuario_id
               LEFT JOIN rol_permiso rp
                 ON rp.rol_id = ur.rol_id AND rp.permiso_id = p.permiso_id
               WHERE p.permiso_clave = 'compras.requerimientos.crear'
                 AND p.permiso_estado = 'activo'
                 AND (up.tipo = 'conceder' OR (rp.rol_permiso_id IS NOT NULL AND COALESCE(up.tipo, '') <> 'denegar'))
             )`,
          [req.user?.id || 0, empleadoId]
        );
        if (firmasCheck.rows.length === 0) {
          throw new AppError('No tienes autorización para crear requerimientos de compra.', 403);
        }
      }

      // Obtener firma del Elaborador para estamparla inmediatamente
      const empFirmaRes = await client.query(
        'SELECT empleado_firma, empleado_nombre, empleado_apellido, centro_costos_id FROM empleado WHERE empleado_id = $1',
        [empleadoId]
      );
      const firmaElaborador = empFirmaRes.rows[0]?.empleado_firma || null;
      if (!firmaElaborador) {
        throw new AppError('Debes registrar y subir tu firma digital antes de crear un requerimiento de compra.', 400);
      }
      const centroCostosAsignadoId = empFirmaRes.rows[0]?.centro_costos_id;
      if (!centroCostosAsignadoId) {
        throw new AppError('El colaborador no tiene un centro de costos asignado. Actualiza su ficha antes de crear el requerimiento.', 400);
      }
      const fechaFirmaElaborador = new Date();
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
          centroCostosAsignadoId,
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
             orden_compra_detalle_tipo_articulo,
             orden_compra_detalle_cantidad, orden_compra_detalle_unidad_medida,
             orden_compra_detalle_precio_unitario, orden_compra_detalle_subtotal,
             orden_compra_detalle_foto, orden_compra_detalle_negociacion_previa,
             orden_compra_detalle_tiempo_entrega, orden_compra_detalle_dias_entrega,
             orden_compra_detalle_incluye_iva,
             orden_compra_detalle_comentario
           ) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            ocId,
            d.producto_id || null,
            d.proveedor_id || null,
            productoNombre || 'Artículo de Consumo',
            d.tipo_articulo || 'OTROS',
            d.cantidad,
            d.unidad_medida || 'Unidad',
            d.precio_unitario || 0,
            d.subtotal || 0,
            d.foto || null,
            d.negociacion_previa || 'NO',
            d.tiempo_entrega || 'INMEDIATO',
            d.tiempo_entrega === 'INMEDIATO' ? (d.dias_entrega || null) : null,
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
      const alcance = await getAlcanceHistorial(req);

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
      const esOrdenPropiaOAsignada =
        row.usuario_id === alcance.usuarioId ||
        (alcance.empleadoId !== null && (
          row.empleado_id === alcance.empleadoId ||
          row.empleado_aprobador_id === alcance.empleadoId ||
          row.empleado_receptor_id === alcance.empleadoId
        ));

      if (!alcance.verTodo && !esOrdenPropiaOAsignada) {
        throw new AppError('No tienes permiso para ver este requerimiento', 403);
      }

      const detailsRes = await pool.query(
        `SELECT ocd.*, prod.producto_nombre, prod.producto_codigo, prod.producto_foto,
                COALESCE(SUM(odr.cantidad_recibida), 0) AS cantidad_recibida,
                COALESCE(array_agg(DISTINCT odr.factura_codigo) FILTER (WHERE odr.factura_codigo IS NOT NULL), '{}') AS facturas_recepcion,
                COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'factura_codigo', odr.factura_codigo,
                      'cantidad_recibida', odr.cantidad_recibida,
                      'fecha_recepcion', odr.fecha_recepcion,
                      'receptor_nombre', usuario_recepcion.usuario_nombre
                    ) ORDER BY odr.fecha_recepcion
                  ) FILTER (WHERE odr.orden_compra_detalle_recepcion_id IS NOT NULL),
                  '[]'::jsonb
                ) AS recepciones,
                prov_det.proveedor_nombre AS detalle_proveedor_nombre
         FROM orden_compra_detalle ocd
         LEFT JOIN producto prod ON ocd.producto_id = prod.producto_id
         LEFT JOIN proveedor prov_det ON ocd.proveedor_id = prov_det.proveedor_id
         LEFT JOIN orden_compra_detalle_recepcion odr ON odr.orden_compra_detalle_id = ocd.orden_compra_detalle_id
         LEFT JOIN usuario usuario_recepcion ON usuario_recepcion.usuario_id = odr.usuario_receptor_id
         WHERE ocd.orden_compra_id = $1
         GROUP BY ocd.orden_compra_detalle_id, prod.producto_id, prov_det.proveedor_id
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
  getAll: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const alcance = await getAlcanceHistorial(req);
      const filtros: string[] = [];
      const params: Array<number | null> = [];

      if (!alcance.verTodo) {
        params.push(alcance.usuarioId);
        params.push(alcance.empleadoId);
        filtros.push(`(
          oc.usuario_id = $1 OR
          oc.empleado_id = $2 OR
          oc.empleado_aprobador_id = $2 OR
          oc.empleado_receptor_id = $2
        )`);
      }

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
         ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
         ORDER BY oc.orden_compra_fecha_solicitud DESC`,
        params
      );

      const items = [];
      for (const row of ocRes.rows) {
        const detailsRes = await pool.query(
          `SELECT ocd.*, prod.producto_nombre, prod.producto_codigo,
                  COALESCE(SUM(odr.cantidad_recibida), 0) AS cantidad_recibida,
                  COALESCE(array_agg(DISTINCT odr.factura_codigo) FILTER (WHERE odr.factura_codigo IS NOT NULL), '{}') AS facturas_recepcion,
                  COALESCE(
                    jsonb_agg(
                      jsonb_build_object(
                        'factura_codigo', odr.factura_codigo,
                        'cantidad_recibida', odr.cantidad_recibida,
                        'fecha_recepcion', odr.fecha_recepcion,
                        'receptor_nombre', usuario_recepcion.usuario_nombre
                      ) ORDER BY odr.fecha_recepcion
                    ) FILTER (WHERE odr.orden_compra_detalle_recepcion_id IS NOT NULL),
                    '[]'::jsonb
                  ) AS recepciones
           FROM orden_compra_detalle ocd
           LEFT JOIN producto prod ON ocd.producto_id = prod.producto_id
           LEFT JOIN orden_compra_detalle_recepcion odr ON odr.orden_compra_detalle_id = ocd.orden_compra_detalle_id
           LEFT JOIN usuario usuario_recepcion ON usuario_recepcion.usuario_id = odr.usuario_receptor_id
           WHERE ocd.orden_compra_id = $1
           GROUP BY ocd.orden_compra_detalle_id, prod.producto_id`,
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
            cantidad_recibida: Number(d.cantidad_recibida || 0),
            facturas_recepcion: d.facturas_recepcion || [],
            recepciones: d.recepciones || [],
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

  // Recibir productos por detalle, con factura y cantidades independientes.
  entregar: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { recepciones } = req.body;
      if (!req.user) throw new AppError('No autenticado', 401);

      if (!Array.isArray(recepciones) || recepciones.length === 0) {
        throw new AppError('Selecciona al menos un producto e ingresa su factura.', 400);
      }

      await client.query('BEGIN');
      const ocRes = await client.query('SELECT * FROM orden_compra WHERE orden_compra_id = $1 FOR UPDATE', [id]);
      if (ocRes.rows.length === 0) throw new AppError('Requerimiento no encontrado', 404);
      const oc = ocRes.rows[0];
      if (oc.orden_compra_estado === 'entregado') throw new AppError('El requerimiento ya fue recibido por completo.', 400);
      if (oc.orden_compra_estado === 'cancelada') throw new AppError('No se puede recibir un requerimiento cancelado.', 400);

      if (!oc.orden_compra_firma_elaborador || !oc.orden_compra_firma_aprobador || !oc.orden_compra_firma_recibido) {
        throw new AppError('El requerimiento debe contar con todas las firmas antes de recibir productos.', 400);
      }

      for (const recepcion of recepciones) {
        const detalleId = Number(recepcion.detalle_id);
        const cantidad = Number(recepcion.cantidad);
        const factura = String(recepcion.factura_codigo || '').trim();
        if (!detalleId || !Number.isInteger(cantidad) || cantidad <= 0 || !factura) {
          throw new AppError('Cada recepción debe tener producto, cantidad válida y número de factura.', 400);
        }

        const detalleRes = await client.query(
          `SELECT ocd.*, COALESCE(SUM(r.cantidad_recibida), 0) AS cantidad_ya_recibida
           FROM orden_compra_detalle ocd
           LEFT JOIN orden_compra_detalle_recepcion r ON r.orden_compra_detalle_id = ocd.orden_compra_detalle_id
           WHERE ocd.orden_compra_detalle_id = $1 AND ocd.orden_compra_id = $2
           GROUP BY ocd.orden_compra_detalle_id`,
          [detalleId, id]
        );
        const detalle = detalleRes.rows[0];
        if (!detalle) throw new AppError('Uno de los productos no pertenece al requerimiento.', 400);
        const pendiente = Number(detalle.orden_compra_detalle_cantidad) - Number(detalle.cantidad_ya_recibida);
        if (cantidad > pendiente) throw new AppError(`La cantidad recibida supera el pendiente de ${detalle.orden_compra_detalle_descripcion}.`, 400);

        await client.query(
          `INSERT INTO orden_compra_detalle_recepcion (orden_compra_detalle_id, factura_codigo, cantidad_recibida, usuario_receptor_id)
           VALUES ($1, $2, $3, $4)`,
          [detalleId, factura, cantidad, req.user.id || null]
        );
        await client.query(
          `INSERT INTO orden_compra_factura (orden_compra_id, factura_codigo)
           SELECT $1, $2::VARCHAR(100) WHERE NOT EXISTS (
             SELECT 1 FROM orden_compra_factura WHERE orden_compra_id = $1 AND factura_codigo = $2::VARCHAR(100)
           )`,
          [id, factura]
        );

        if (detalle.producto_id) {
          const prodRes = await client.query('SELECT producto_stock FROM producto WHERE producto_id = $1 FOR UPDATE', [detalle.producto_id]);
          if (prodRes.rows.length > 0) {
            const stockAnterior = Number(prodRes.rows[0].producto_stock);
            const stockNuevo = stockAnterior + cantidad;
            await client.query('UPDATE producto SET producto_stock = $1, producto_fecha_modificacion = CURRENT_TIMESTAMP WHERE producto_id = $2', [stockNuevo, detalle.producto_id]);
            await client.query(
              `INSERT INTO movimiento_inventario (producto_id, sucursal_id, usuario_id, movimiento_inventario_tipo,
                movimiento_inventario_cantidad, movimiento_inventario_stock_anterior, movimiento_inventario_stock_nuevo,
                movimiento_inventario_observacion, orden_compra_id)
               VALUES ($1, $2, $3, 'orden_compra', $4, $5, $6, $7, $8)`,
              [detalle.producto_id, oc.sucursal_id, req.user.id || 1, cantidad, stockAnterior, stockNuevo,
                `Recepción parcial de ${oc.orden_compra_codigo} - Factura: ${factura}`, id]
            );
          }
        }
      }

      const pendientesRes = await client.query(
        `SELECT COUNT(*)::int AS pendientes FROM orden_compra_detalle ocd
         LEFT JOIN (SELECT orden_compra_detalle_id, SUM(cantidad_recibida) AS recibida FROM orden_compra_detalle_recepcion GROUP BY orden_compra_detalle_id) r
           ON r.orden_compra_detalle_id = ocd.orden_compra_detalle_id
         WHERE ocd.orden_compra_id = $1 AND COALESCE(r.recibida, 0) < ocd.orden_compra_detalle_cantidad`, [id]
      );
      const completo = pendientesRes.rows[0].pendientes === 0;
      if (completo) {
        await client.query(
          `UPDATE orden_compra
           SET orden_compra_estado = 'entregado',
               orden_compra_fecha_recepcion = CURRENT_TIMESTAMP,
               usuario_receptor_id = $1,
               orden_compra_fecha_modificacion = CURRENT_TIMESTAMP
           WHERE orden_compra_id = $2`,
          [req.user.id || 1, id]
        );
      } else {
        await client.query(
          `UPDATE orden_compra
           SET orden_compra_estado = 'recibida_parcial',
               usuario_receptor_id = $1,
               orden_compra_fecha_modificacion = CURRENT_TIMESTAMP
           WHERE orden_compra_id = $2`,
          [req.user.id || 1, id]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true, data: { completo }, message: completo ? 'Recepción total registrada e inventario actualizado.' : 'Recepción parcial registrada. Quedan productos pendientes.' });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      console.error('Error al registrar recepción parcial de requerimiento:', error);
      throw new AppError('Error al procesar la recepción parcial', 500);
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
        throw new AppError('No tienes una firma registrada. Sube tu firma desde tu panel o solicita al Administrador que la registre.', 400);
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

      const { permissions, isAdmin } = await getUsuarioPermisos(req.user?.id || 0, req.user?.rol_id || 3);
      if (!isAdmin && isAprobador && !permissions.has('compras.requerimientos.aprobar')) {
        throw new AppError('No tienes permiso para aprobar requerimientos de compra.', 403);
      }
      if (!isAdmin && isReceptor && !permissions.has('compras.requerimientos.recibir')) {
        throw new AppError('No tienes permiso para recibir requerimientos de compra.', 403);
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
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
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

      const checkRes = await client.query(
        `SELECT empleado_aprobador_id, empleado_receptor_id, 
                orden_compra_firma_aprobador, orden_compra_fecha_firma_aprobador,
                orden_compra_firma_recibido, orden_compra_fecha_firma_recibido,
                orden_compra_estado 
         FROM orden_compra WHERE orden_compra_id = $1`, 
        [id]
      );
      if (checkRes.rows.length === 0) {
        throw new AppError('Requerimiento no encontrado', 404);
      }

      const ocDb = checkRes.rows[0];

      const oldAprobadorId = ocDb.empleado_aprobador_id ? Number(ocDb.empleado_aprobador_id) : null;
      const oldReceptorId = ocDb.empleado_receptor_id ? Number(ocDb.empleado_receptor_id) : null;

      const valNewAprobadorId = empleado_aprobador_id ? Number(empleado_aprobador_id) : null;
      const valNewReceptorId = empleado_receptor_id ? Number(empleado_receptor_id) : null;

      let newFirmaAprobador = ocDb.orden_compra_firma_aprobador;
      let newFechaFirmaAprobador = ocDb.orden_compra_fecha_firma_aprobador;
      let newFirmaRecibido = ocDb.orden_compra_firma_recibido;
      let newFechaFirmaRecibido = ocDb.orden_compra_fecha_firma_recibido;
      let newEstado = ocDb.orden_compra_estado;

      // Si cambia el aprobador, se borran ambas firmas y el estado vuelve a pendiente
      if (oldAprobadorId !== valNewAprobadorId) {
        newFirmaAprobador = null;
        newFechaFirmaAprobador = null;
        newFirmaRecibido = null;
        newFechaFirmaRecibido = null;
        newEstado = 'pendiente';
      }

      // Si cambia el recibidor, se borra su firma. Si estaba recibida, vuelve a aprobada.
      if (oldReceptorId !== valNewReceptorId) {
        newFirmaRecibido = null;
        newFechaFirmaRecibido = null;
        if (newEstado === 'recibida') {
          newEstado = 'aprobada';
        }
      }

      await client.query(
        `UPDATE orden_compra 
         SET empresa_id = $1, sucursal_id = $2, departamento_id = $3, centro_costos_id = $4, 
             proveedor_id = $5, orden_compra_justificacion = $6, orden_compra_tipo_articulo = $7, 
             orden_compra_negociacion_previa = $8, orden_compra_forma_pago = $9, orden_compra_plazo_pago = $10, 
             orden_compra_tiempo_entrega = $11, orden_compra_lugar_recepcion = $12, orden_compra_requiere_contrato = $13, 
             orden_compra_requiere_seguro = $14, orden_compra_requiere_mantenimiento = $15, orden_compra_asignado_trabajador = $16, 
             orden_compra_trabajador_asignado = $17, orden_compra_caracteristicas = $18, orden_compra_tipo_compra = $19,
             empleado_aprobador_id = $20, empleado_receptor_id = $21,
             orden_compra_aprobado_por = $22, orden_compra_recibido_por = $23,
             orden_compra_firma_aprobador = $24, orden_compra_fecha_firma_aprobador = $25,
             orden_compra_firma_recibido = $26, orden_compra_fecha_firma_recibido = $27,
             orden_compra_estado = $28,
             orden_compra_fecha_modificacion = CURRENT_TIMESTAMP
         WHERE orden_compra_id = $29`,
        [
          empresa_id,
          sucursal_id,
          departamento_id,
          centro_costos_id,
          proveedor_id || null,
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
          tipo_compra || 'LOCAL',
          valNewAprobadorId,
          valNewReceptorId,
          aprobado_por || null,
          recibido_por || null,
          newFirmaAprobador,
          newFechaFirmaAprobador,
          newFirmaRecibido,
          newFechaFirmaRecibido,
          newEstado,
          id
        ]
      );

      await client.query('DELETE FROM orden_compra_detalle WHERE orden_compra_id = $1', [id]);

      for (const d of detalles) {
        let productoNombre = d.descripcion || d.orden_compra_detalle_descripcion;
        if (d.producto_id) {
          const prodRes = await client.query('SELECT producto_nombre FROM producto WHERE producto_id = $1', [d.producto_id]);
          if (prodRes.rows.length > 0) {
            productoNombre = prodRes.rows[0].producto_nombre;
          }
        }

        await client.query(
          `INSERT INTO orden_compra_detalle (
             orden_compra_id, producto_id, proveedor_id, orden_compra_detalle_descripcion, 
             orden_compra_detalle_tipo_articulo,
             orden_compra_detalle_cantidad, orden_compra_detalle_unidad_medida,
             orden_compra_detalle_precio_unitario, orden_compra_detalle_subtotal,
             orden_compra_detalle_foto, orden_compra_detalle_negociacion_previa,
             orden_compra_detalle_tiempo_entrega, orden_compra_detalle_dias_entrega,
             orden_compra_detalle_incluye_iva,
             orden_compra_detalle_comentario
           ) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            id,
            d.producto_id || null,
            d.proveedor_id || null,
            productoNombre || 'Artículo de Consumo',
            d.tipo_articulo || d.orden_compra_detalle_tipo_articulo || 'OTROS',
            d.cantidad || d.orden_compra_detalle_cantidad,
            d.unidad_medida || d.orden_compra_detalle_unidad_medida || 'Unidad',
            d.precio_unitario || d.orden_compra_detalle_precio_unitario || 0,
            d.subtotal || d.orden_compra_detalle_subtotal || 0,
            d.foto || d.orden_compra_detalle_foto || null,
            d.negociacion_previa || d.orden_compra_detalle_negociacion_previa || 'NO',
            d.tiempo_entrega || d.orden_compra_detalle_tiempo_entrega || 'INMEDIATO',
            (d.tiempo_entrega || d.orden_compra_detalle_tiempo_entrega || 'INMEDIATO') === 'INMEDIATO'
              ? (d.dias_entrega || d.orden_compra_detalle_dias_entrega || null)
              : null,
            d.incluye_iva === undefined ? (d.orden_compra_detalle_incluye_iva === undefined ? true : !!d.orden_compra_detalle_incluye_iva) : !!d.incluye_iva,
            d.comentario || d.orden_compra_detalle_comentario || null
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Requerimiento actualizado exitosamente.'
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar el requerimiento', 500);
    } finally {
      client.release();
    }
  }
};
