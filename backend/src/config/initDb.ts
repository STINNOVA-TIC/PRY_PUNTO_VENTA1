import pool from './db';

export const initDb = async () => {
  try {
    console.log('🔄 Iniciando migración y verificación de base de datos...');

    // 1. Crear tabla de autoconsumo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autoconsumo (
        autoconsumo_id SERIAL PRIMARY KEY,
        empleado_id INTEGER NOT NULL REFERENCES empleado(empleado_id) ON DELETE RESTRICT,
        sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
        departamento_id INTEGER NOT NULL REFERENCES departamento(departamento_id) ON DELETE RESTRICT,
        centro_costos_id INTEGER NOT NULL REFERENCES centro_costos(centro_costos_id) ON DELETE RESTRICT,
        
        autoconsumo_codigo VARCHAR(50) UNIQUE NOT NULL,
        autoconsumo_justificacion TEXT NOT NULL,
        autoconsumo_fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        autoconsumo_fecha_entrega TIMESTAMP NULL,
        autoconsumo_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (autoconsumo_estado IN ('pendiente', 'aprobado', 'entregado', 'rechazado', 'cancelado')),
        autoconsumo_observacion TEXT NULL,
        
        usuario_aprobador_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
        autoconsumo_fecha_aprobacion TIMESTAMP NULL,
        
        usuario_entrega_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
        autoconsumo_foto_entrega VARCHAR(255) NULL,
        
        autoconsumo_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        autoconsumo_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Crear tabla de autoconsumo_detalle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autoconsumo_detalle (
        autoconsumo_detalle_id SERIAL PRIMARY KEY,
        autoconsumo_id INTEGER NOT NULL REFERENCES autoconsumo(autoconsumo_id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES producto(producto_id) ON DELETE RESTRICT,
        autoconsumo_detalle_cantidad INTEGER NOT NULL CHECK (autoconsumo_detalle_cantidad > 0),
        autoconsumo_detalle_precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
        autoconsumo_detalle_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
      );
    `);

    // 3. Crear índices si no existen
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_autoconsumo_estado ON autoconsumo(autoconsumo_estado);
      CREATE INDEX IF NOT EXISTS idx_autoconsumo_codigo ON autoconsumo(autoconsumo_codigo);
    `);

    // 4. Migración: permitir devoluciones de autoconsumos en la tabla devolucion
    await pool.query(`
      ALTER TABLE devolucion
        ALTER COLUMN solicitud_entrega_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS autoconsumo_id INTEGER NULL;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_devolucion_autoconsumo'
        ) THEN
          ALTER TABLE devolucion
            ADD CONSTRAINT fk_devolucion_autoconsumo
            FOREIGN KEY (autoconsumo_id) REFERENCES autoconsumo(autoconsumo_id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // 4.1. Migración: trazar autoconsumos en movimiento_inventario
    await pool.query(`
      ALTER TABLE movimiento_inventario ADD COLUMN IF NOT EXISTS autoconsumo_id INTEGER NULL;
    `);

    // 4.2. Migración: indicador de IVA por línea de detalle de orden de compra
    await pool.query(`
      ALTER TABLE orden_compra_detalle
        ADD COLUMN IF NOT EXISTS orden_compra_detalle_incluye_iva BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // 4.3. Migración: firma digital en empleado
    await pool.query(`
      ALTER TABLE empleado
        ADD COLUMN IF NOT EXISTS empleado_firma VARCHAR(255) NULL;
    `);

    // 4.4. Migración: firmas digitales y empleados de aprobación/recepción en orden_compra
    await pool.query(`
      ALTER TABLE orden_compra
        ADD COLUMN IF NOT EXISTS orden_compra_firma_elaborador VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_fecha_firma_elaborador TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_firma_aprobador VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_fecha_firma_aprobador TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_firma_recibido VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_fecha_firma_recibido TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS empleado_aprobador_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS empleado_receptor_id INTEGER NULL;
    `);

    // 4.5. Migración: claves foráneas de empleados en orden_compra
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_orden_compra_empleado_aprobador'
        ) THEN
          ALTER TABLE orden_compra
            ADD CONSTRAINT fk_orden_compra_empleado_aprobador
            FOREIGN KEY (empleado_aprobador_id) REFERENCES empleado(empleado_id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_orden_compra_empleado_receptor'
        ) THEN
          ALTER TABLE orden_compra
            ADD CONSTRAINT fk_orden_compra_empleado_receptor
            FOREIGN KEY (empleado_receptor_id) REFERENCES empleado(empleado_id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 4.6. Migración: índice de unicidad para códigos de retiro
    await pool.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT solicitud_entrega_id, solicitud_entrega_codigo
          FROM solicitud_entrega
          WHERE solicitud_entrega_codigo IN (
            SELECT solicitud_entrega_codigo
            FROM solicitud_entrega
            GROUP BY solicitud_entrega_codigo
            HAVING COUNT(*) > 1
          )
          ORDER BY solicitud_entrega_id
        LOOP
          UPDATE solicitud_entrega
          SET solicitud_entrega_codigo = solicitud_entrega_codigo || '-' || solicitud_entrega_id
          WHERE solicitud_entrega_id = r.solicitud_entrega_id;
        END LOOP;
      END $$;
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitud_entrega_codigo ON solicitud_entrega(solicitud_entrega_codigo);
    `);

    // 5. Migración: Crear tabla usuario_permiso si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario_permiso (
        usuario_permiso_id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
        permiso_id INTEGER NOT NULL REFERENCES permiso(permiso_id) ON DELETE CASCADE,
        tipo VARCHAR(10) DEFAULT 'conceder' CHECK (tipo IN ('conceder', 'denegar')),
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, permiso_id)
      );
      CREATE INDEX IF NOT EXISTS idx_usuario_permiso_user ON usuario_permiso(usuario_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_permiso_clave ON permiso(permiso_clave);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_empleado_unico
        ON usuario(empleado_id) WHERE empleado_id IS NOT NULL;
    `);

    // 5.1 Migración: Convertir roles auxiliares en permisos y eliminarlos
    await pool.query(`
      -- Si existían roles 8 o 9, migrar a permisos de usuario
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM rol WHERE rol_nombre = 'empleado_autorizado') THEN
          INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo)
          SELECT ur.usuario_id, p.permiso_id, 'conceder'
          FROM usuario_rol ur
          JOIN rol r ON r.rol_id = ur.rol_id AND r.rol_nombre = 'empleado_autorizado'
          JOIN permiso p ON p.permiso_clave = 'autoconsumo.crear'
          ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET tipo = 'conceder';
        END IF;

        IF EXISTS (SELECT 1 FROM rol WHERE rol_nombre = 'empleado_autorizado_firmar') THEN
          INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo)
          SELECT ur.usuario_id, p.permiso_id, 'conceder'
          FROM usuario_rol ur
          JOIN rol r ON r.rol_id = ur.rol_id AND r.rol_nombre = 'empleado_autorizado_firmar'
          JOIN permiso p ON p.permiso_clave = 'requerimientos.firmar'
          ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET tipo = 'conceder';
        END IF;

        DELETE FROM usuario_rol WHERE rol_id IN (SELECT rol_id FROM rol WHERE rol_nombre IN ('empleado_autorizado', 'empleado_autorizado_firmar'));
        DELETE FROM rol_permiso WHERE rol_id IN (SELECT rol_id FROM rol WHERE rol_nombre IN ('empleado_autorizado', 'empleado_autorizado_firmar'));
        DELETE FROM rol WHERE rol_nombre IN ('empleado_autorizado', 'empleado_autorizado_firmar');
      END $$;

      SELECT setval('rol_rol_id_seq', COALESCE((SELECT MAX(rol_id)+1 FROM rol), 1), false);
    `);

    // 6. Migración Segura: Sembrar Módulos del Sistema (idempotente)
    await pool.query(`
      INSERT INTO modulo (modulo_id, modulo_nombre, modulo_descripcion, modulo_icono, modulo_estado) VALUES
      (1, 'Usuarios', 'Gestión de cuentas y accesos del sistema', 'Users', 'activo'),
      (2, 'Roles', 'Gestión de roles y niveles jerárquicos', 'Shield', 'activo'),
      (3, 'Empleados', 'Ficha y datos del personal', 'UserCheck', 'activo'),
      (4, 'Productos', 'Catálogo de productos, categorías y proveedores', 'Package', 'activo'),
      (5, 'Inventario', 'Movimientos, ajustes y stock de almacén', 'Boxes', 'activo'),
      (6, 'Ventas', 'Consumo y ventas internas', 'ShoppingCart', 'activo'),
      (7, 'Entregas', 'Despacho y verificación en bodega', 'Truck', 'activo'),
      (8, 'Reportes', 'Reportes de gestión, financieros y consumo', 'BarChart3', 'activo'),
      (9, 'Nómina', 'Descuentos y cierres salariales', 'DollarSign', 'activo'),
      (10, 'Configuración', 'Parámetros del sistema y auditoría', 'Settings', 'activo'),
      (11, 'Autoconsumo', 'Solicitudes de bienes internos para áreas de la empresa', 'ClipboardCheck', 'activo'),
      (12, 'Compras', 'Requerimientos, aprobaciones y recepción de compras corporativas', 'CartCheck', 'activo')
      ON CONFLICT (modulo_nombre) DO NOTHING;
      SELECT setval('modulo_modulo_id_seq', COALESCE((SELECT MAX(modulo_id)+1 FROM modulo), 1), false);
    `);

    // 6.1 Sembrar Permisos del Sistema (idempotente)
    await pool.query(`
      INSERT INTO permiso (modulo_id, permiso_nombre, permiso_descripcion, permiso_clave, permiso_estado) VALUES
      (1, 'Ver Usuarios', 'Permite listar y ver información de usuarios del sistema', 'usuarios.ver', 'activo'),
      (1, 'Crear Usuarios', 'Permite registrar nuevos usuarios operativos', 'usuarios.crear', 'activo'),
      (1, 'Editar Usuarios', 'Permite modificar usuarios existentes', 'usuarios.editar', 'activo'),
      (1, 'Eliminar Usuarios', 'Permite eliminar registros de usuarios', 'usuarios.eliminar', 'activo'),
      (1, 'Activar Usuarios', 'Permite reactivar usuarios inactivos', 'usuarios.activar', 'activo'),
      (1, 'Desactivar Usuarios', 'Permite suspender o desactivar usuarios', 'usuarios.desactivar', 'activo'),
      (2, 'Ver Roles', 'Permite consultar roles y permisos', 'roles.ver', 'activo'),
      (2, 'Crear Roles', 'Permite crear nuevos roles', 'roles.crear', 'activo'),
      (2, 'Editar Roles', 'Permite modificar roles existentes', 'roles.editar', 'activo'),
      (2, 'Eliminar Roles', 'Permite eliminar roles', 'roles.eliminar', 'activo'),
      (3, 'Ver Empleados', 'Permite ver el directorio de empleados', 'empleados.ver', 'activo'),
      (3, 'Ver Datos Sensibles Empleados', 'Permite visualizar salarios y datos confidenciales', 'empleados.ver_datos_sensibles', 'activo'),
      (3, 'Crear Empleados', 'Permite registrar nuevos empleados', 'empleados.crear', 'activo'),
      (3, 'Editar Empleados', 'Permite actualizar datos de empleados', 'empleados.editar', 'activo'),
      (3, 'Eliminar Empleados', 'Permite eliminar empleados', 'empleados.eliminar', 'activo'),
      (3, 'Activar Empleados', 'Permite activar estado de empleado', 'empleados.activar', 'activo'),
      (3, 'Desactivar Empleados', 'Permite desactivar empleados', 'empleados.desactivar', 'activo'),
      (3, 'Ver Historial de Compras Empleados', 'Permite revisar historial de compras de los empleados', 'empleados.ver_historial_compras', 'activo'),
      (4, 'Ver Productos', 'Permite consultar catálogo de productos', 'productos.ver', 'activo'),
      (4, 'Crear Productos', 'Permite ingresar nuevos productos al catálogo', 'productos.crear', 'activo'),
      (4, 'Editar Productos', 'Permite modificar precios y datos de productos', 'productos.editar', 'activo'),
      (4, 'Eliminar Productos', 'Permite eliminar productos del catálogo', 'productos.eliminar', 'activo'),
      (4, 'Activar Productos', 'Permite activar productos', 'productos.activar', 'activo'),
      (4, 'Desactivar Productos', 'Permite desactivar productos', 'productos.desactivar', 'activo'),
      (5, 'Ver Inventario', 'Permite consultar niveles de inventario', 'inventario.ver', 'activo'),
      (5, 'Ver Movimientos Inventario', 'Permite auditar entradas y salidas de bodega', 'inventario.ver_movimientos', 'activo'),
      (5, 'Ajustar Stock', 'Permite realizar ajustes manuales de existencias', 'inventario.ajustar_stock', 'activo'),
      (5, 'Ingresar Mercancía', 'Permite registrar ingresos de productos a stock', 'inventario.ingresar_mercancia', 'activo'),
      (5, 'Ver Costos Inventario', 'Permite ver los precios de compra y costos de almacén', 'inventario.ver_costos', 'activo'),
      (6, 'Realizar Ventas', 'Permite emitir solicitudes de compra interna', 'ventas.realizar', 'activo'),
      (6, 'Ver Ventas', 'Permite ver todas las ventas y pedidos de la empresa', 'ventas.ver', 'activo'),
      (6, 'Ver Ventas Propias', 'Permite al empleado ver únicamente sus compras', 'ventas.ver_propias', 'activo'),
      (6, 'Anular Ventas', 'Permite anular ventas o pedidos procesados', 'ventas.anular', 'activo'),
      (6, 'Cancelar Ventas', 'Permite cancelar solicitudes de compra pendientes', 'ventas.cancelar', 'activo'),
      (7, 'Ver Entregas', 'Permite visualizar el módulo de entregas', 'entregas.ver', 'activo'),
      (7, 'Ver Entregas Pendientes', 'Permite listar despachos pendientes de retiro', 'entregas.ver_pendientes', 'activo'),
      (7, 'Confirmar Entrega', 'Permite despachar pedidos y tomar foto de evidencia', 'entregas.confirmar', 'activo'),
      (7, 'Verificar Empleado Entrega', 'Permite validar identidad del colaborador mediante código', 'entregas.verificar_empleado', 'activo'),
      (7, 'Reportar Incidente Entrega', 'Permite marcar no entregado o incidencia en bodega', 'entregas.reportar_incidente', 'activo'),
      (8, 'Ver Reportes', 'Permite acceder a la sección de reportes', 'reportes.ver', 'activo'),
      (8, 'Ver Reportes Financieros', 'Permite ver métricas de ventas y costos', 'reportes.ver_financieros', 'activo'),
      (8, 'Ver Consumo de Empleados', 'Permite generar reportes de consumo por colaborador', 'reportes.ver_consumo_empleados', 'activo'),
      (8, 'Ver Reporte de Inventario', 'Permite auditar existencias y rotación', 'reportes.ver_inventario', 'activo'),
      (8, 'Exportar Reportes', 'Permite descargar archivos PDF/Excel', 'reportes.exportar', 'activo'),
      (9, 'Ver Nómina', 'Permite consultar el módulo de nómina', 'nomina.ver', 'activo'),
      (9, 'Ver Nómina Propia', 'Permite al empleado consultar sus descuentos aplicados', 'nomina.ver_propia', 'activo'),
      (9, 'Ver Todos Nómina', 'Permite a TTHH revisar nómina de todos los colaboradores', 'nomina.ver_todos', 'activo'),
      (9, 'Aplicar Descuento Nómina', 'Permite aplicar deducciones de nómina generadas', 'nomina.aplicar_descuento', 'activo'),
      (9, 'Configurar Descuentos Nómina', 'Permite establecer parámetros de descuentos', 'nomina.configurar_descuentos', 'activo'),
      (10, 'Ver Configuración', 'Permite consultar parámetros de sistema', 'configuracion.ver', 'activo'),
      (10, 'Editar Configuración', 'Permite modificar parámetros maestros', 'configuracion.editar', 'activo'),
      (10, 'Ver Logs Auditoría', 'Permite ver bitácoras y registros de seguridad', 'configuracion.ver_logs', 'activo'),
      (11, 'Ver Autoconsumos', 'Permite ver requerimientos y solicitudes de autoconsumo', 'autoconsumo.ver', 'activo'),
      (11, 'Crear Autoconsumo', 'Permite solicitar insumos y bienes para áreas internas', 'autoconsumo.crear', 'activo'),
      (11, 'Aprobar Autoconsumo', 'Permite autorizar solicitudes de consumo interno', 'autoconsumo.aprobar', 'activo'),
      (11, 'Entregar Autoconsumo', 'Permite a bodega registrar entrega de insumos autorizados', 'autoconsumo.entregar', 'activo'),
      (11, 'Eliminar Autoconsumo', 'Permite cancelar o borrar requerimientos de consumo', 'autoconsumo.eliminar', 'activo'),
      (11, 'Firmar Requerimientos', 'Permite firmar órdenes de compra y requerimientos', 'requerimientos.firmar', 'activo'),
      (4, 'Ver Proveedores', 'Permite consultar catálogo de proveedores', 'proveedores.ver', 'activo'),
      (4, 'Crear Proveedores', 'Permite registrar nuevos proveedores', 'proveedores.crear', 'activo'),
      (4, 'Editar Proveedores', 'Permite modificar proveedores', 'proveedores.editar', 'activo'),
      (4, 'Ver Categorías', 'Permite consultar categorías de productos', 'categorias.ver', 'activo'),
      (4, 'Crear Categorías', 'Permite crear categorías de productos', 'categorias.crear', 'activo'),
      (4, 'Editar Categorías', 'Permite editar categorías de productos', 'categorias.editar', 'activo'),
      (12, 'Ver Compras', 'Permite acceder al área corporativa de Compras', 'compras.ver', 'activo'),
      (12, 'Crear Requerimientos de Compra', 'Permite crear requerimientos para el área solicitante', 'compras.requerimientos.crear', 'activo'),
      (12, 'Editar Requerimientos de Compra', 'Permite editar requerimientos corporativos', 'compras.requerimientos.editar', 'activo'),
      (12, 'Aprobar Requerimientos de Compra', 'Permite aprobar y firmar requerimientos corporativos', 'compras.requerimientos.aprobar', 'activo'),
      (12, 'Recibir Compras', 'Permite registrar la recepción de bienes comprados', 'compras.requerimientos.recibir', 'activo'),
      (12, 'Eliminar Requerimientos de Compra', 'Permite eliminar requerimientos corporativos', 'compras.requerimientos.eliminar', 'activo')
      ON CONFLICT (permiso_nombre) DO NOTHING;
      SELECT setval('permiso_permiso_id_seq', COALESCE((SELECT MAX(permiso_id)+1 FROM permiso), 1), false);
    `);

    // 6.2 Asociar Permisos a Roles en rol_permiso (idempotente)
    await pool.query(`
      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 1, permiso_id FROM permiso WHERE permiso_estado = 'activo'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;

      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 2, permiso_id FROM permiso WHERE permiso_clave IN (
        'empleados.ver', 'empleados.ver_historial_compras', 'entregas.ver', 'entregas.ver_pendientes',
        'entregas.confirmar', 'entregas.verificar_empleado', 'entregas.reportar_incidente',
        'reportes.ver', 'reportes.ver_consumo_empleados', 'inventario.ver', 'productos.ver',
        'autoconsumo.ver', 'autoconsumo.entregar', 'compras.ver', 'compras.requerimientos.crear'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;

      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 3, permiso_id FROM permiso WHERE permiso_clave IN (
        'ventas.realizar', 'ventas.ver_propias', 'empleados.ver', 'productos.ver', 'entregas.ver',
        'inventario.ver', 'reportes.ver_consumo_empleados', 'nomina.ver_propia', 'autoconsumo.ver'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;

      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 4, permiso_id FROM permiso WHERE permiso_clave IN (
        'productos.ver', 'productos.crear', 'productos.editar', 'productos.activar', 'productos.desactivar',
        'inventario.ver', 'inventario.ver_movimientos', 'inventario.ajustar_stock', 'inventario.ingresar_mercancia', 'inventario.ver_costos',
        'reportes.ver', 'reportes.ver_inventario', 'reportes.exportar',
        'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
        'categorias.ver', 'categorias.crear', 'categorias.editar',
        'autoconsumo.ver', 'empleados.ver', 'compras.ver', 'compras.requerimientos.crear',
        'compras.requerimientos.editar', 'compras.requerimientos.recibir', 'compras.requerimientos.eliminar'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;

      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 5, permiso_id FROM permiso WHERE permiso_clave IN (
        'usuarios.ver',
        'empleados.ver', 'empleados.ver_datos_sensibles', 'empleados.crear', 'empleados.editar', 'empleados.activar', 'empleados.desactivar', 'empleados.ver_historial_compras',
        'productos.ver', 'productos.crear', 'productos.editar', 'productos.activar', 'productos.desactivar',
        'inventario.ver', 'inventario.ver_movimientos', 'inventario.ajustar_stock', 'inventario.ingresar_mercancia', 'inventario.ver_costos',
        'ventas.realizar', 'ventas.ver', 'ventas.anular', 'ventas.cancelar',
        'entregas.ver', 'entregas.ver_pendientes', 'entregas.confirmar', 'entregas.verificar_empleado', 'entregas.reportar_incidente',
        'reportes.ver', 'reportes.ver_financieros', 'reportes.ver_consumo_empleados', 'reportes.ver_inventario', 'reportes.exportar',
        'nomina.ver', 'nomina.ver_todos', 'nomina.aplicar_descuento',
        'autoconsumo.ver', 'autoconsumo.crear', 'autoconsumo.aprobar', 'autoconsumo.entregar',
        'compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;

      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 6, permiso_id FROM permiso WHERE permiso_clave IN (
        'reportes.ver', 'reportes.ver_financieros', 'reportes.exportar', 'nomina.ver', 'nomina.ver_todos',
        'ventas.ver', 'empleados.ver', 'empleados.ver_datos_sensibles',
        'compras.ver', 'compras.requerimientos.crear'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;

      INSERT INTO rol_permiso (rol_id, permiso_id)
      SELECT 7, permiso_id FROM permiso WHERE permiso_clave IN (
        'reportes.ver', 'reportes.ver_consumo_empleados', 'nomina.ver', 'nomina.ver_todos',
        'nomina.aplicar_descuento', 'nomina.configurar_descuentos', 'empleados.ver', 'empleados.ver_datos_sensibles',
        'autoconsumo.ver', 'autoconsumo.aprobar', 'compras.ver', 'compras.requerimientos.crear'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    `);



    console.log('✅ Verificación y migración de base de datos completada exitosamente.');
  } catch (error: any) {
    console.error('❌ Error durante la migración de base de datos:', error.message);
  }
};
