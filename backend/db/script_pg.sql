-- =============================================
-- 1. ELIMINAR TABLAS EXISTENTES (SI ES NECESARIO)
-- =============================================
DROP TABLE IF EXISTS descuento_nomina_detalle CASCADE;
DROP TABLE IF EXISTS descuento_nomina CASCADE;
DROP TABLE IF EXISTS devolucion_detalle CASCADE;
DROP TABLE IF EXISTS devolucion CASCADE;
DROP TABLE IF EXISTS orden_compra_factura CASCADE;
DROP TABLE IF EXISTS orden_compra_detalle CASCADE;
DROP TABLE IF EXISTS orden_compra CASCADE;
DROP TABLE IF EXISTS movimiento_inventario CASCADE;
DROP TABLE IF EXISTS solicitud_entrega_detalle CASCADE;
DROP TABLE IF EXISTS solicitud_entrega CASCADE;
DROP TABLE IF EXISTS venta_detalle CASCADE;
DROP TABLE IF EXISTS venta CASCADE;
DROP TABLE IF EXISTS reporte CASCADE;
DROP TABLE IF EXISTS usuario_rol CASCADE;
DROP TABLE IF EXISTS rol_permiso CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS empleado CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS categoria CASCADE;
DROP TABLE IF EXISTS proveedor CASCADE;
DROP TABLE IF EXISTS permiso CASCADE;
DROP TABLE IF EXISTS modulo CASCADE;
DROP TABLE IF EXISTS rol CASCADE;
DROP TABLE IF EXISTS departamento CASCADE;
DROP TABLE IF EXISTS sucursal CASCADE;
DROP TABLE IF EXISTS centro_costos CASCADE;
DROP TABLE IF EXISTS empresa CASCADE;


-- =============================================
-- 2. TABLAS PRINCIPALES (SIN DEPENDENCIAS)
-- =============================================

-------- Empresa
CREATE TABLE empresa (
    empresa_id SERIAL PRIMARY KEY,
    empresa_codigo VARCHAR(50) NULL,
    empresa_ruc VARCHAR(20) UNIQUE NOT NULL,
    empresa_razon_social VARCHAR(200) NOT NULL,
    empresa_nombre_comercial VARCHAR(200) NULL,
    empresa_telefono VARCHAR(20) NULL,
    empresa_email VARCHAR(100) NULL,
    empresa_direccion VARCHAR(255) NULL,
    empresa_logo VARCHAR(255) NULL,
    empresa_provincia VARCHAR(100) NULL,
    empresa_ciudad VARCHAR(100) NULL,
    empresa_estado VARCHAR(20) DEFAULT 'activo' CHECK (empresa_estado IN ('activo', 'inactivo')),
    empresa_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    empresa_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    empresa_fecha_desactivacion TIMESTAMP NULL
);

-------- Centro de Costos
CREATE TABLE centro_costos (
    centro_costos_id SERIAL PRIMARY KEY,
    centro_costos_codigo VARCHAR(20) UNIQUE NOT NULL,
    centro_costos_nombre VARCHAR(100) NOT NULL,
    centro_costos_descripcion VARCHAR(255) NULL,
    centro_costos_tipo VARCHAR(50) NULL,
    centro_costos_presupuesto NUMERIC(12,2) NULL,
    centro_costos_observacion TEXT NULL,
    centro_costos_estado VARCHAR(20) DEFAULT 'activo' CHECK (centro_costos_estado IN ('activo', 'inactivo', 'cerrado')),
    centro_costos_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    centro_costos_fecha_cierre TIMESTAMP NULL
);

-------- Sucursal
CREATE TABLE sucursal (
    sucursal_id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresa(empresa_id) ON DELETE RESTRICT,
    sucursal_nombre VARCHAR(100) NOT NULL,
    sucursal_direccion VARCHAR(255) NULL,
    sucursal_telefono VARCHAR(20) NULL,
    sucursal_estado VARCHAR(20) DEFAULT 'activo' CHECK (sucursal_estado IN ('activo', 'inactivo')),
    sucursal_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sucursal_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sucursal_fecha_desactivacion TIMESTAMP NULL
);

-------- Departamento
CREATE TABLE departamento (
    departamento_id SERIAL PRIMARY KEY,
    centro_costos_id INTEGER NULL REFERENCES centro_costos(centro_costos_id) ON DELETE SET NULL,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
    departamento_codigo VARCHAR(10) UNIQUE NOT NULL,  -- (ej: VEN, MKT, TIC, LOG)
    departamento_nombre VARCHAR(100) NOT NULL,
    departamento_descripcion VARCHAR(255) NULL,
    departamento_estado VARCHAR(20) DEFAULT 'activo' CHECK (departamento_estado IN ('activo', 'inactivo')),
    departamento_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    departamento_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    departamento_fecha_desactivacion TIMESTAMP NULL
);

-------- Proveedor
CREATE TABLE proveedor (
    proveedor_id SERIAL PRIMARY KEY,
    proveedor_codigo VARCHAR(50) UNIQUE NOT NULL,
    proveedor_nombre VARCHAR(100) NOT NULL,
    proveedor_contacto VARCHAR(100) NULL,
    proveedor_telefono VARCHAR(20) NULL,
    proveedor_email VARCHAR(100) NULL,
    proveedor_direccion VARCHAR(255) NULL,
    proveedor_estado VARCHAR(20) DEFAULT 'activo' CHECK (proveedor_estado IN ('activo', 'inactivo')),
    proveedor_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    proveedor_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Categoria
CREATE TABLE categoria (
    categoria_id SERIAL PRIMARY KEY,
    categoria_padre_id INTEGER NULL REFERENCES categoria(categoria_id) ON DELETE RESTRICT,
    categoria_codigo VARCHAR(50) UNIQUE NOT NULL,
    categoria_nombre VARCHAR(100) NOT NULL,
    categoria_descripcion VARCHAR(255) NULL,
    categoria_orden INTEGER DEFAULT 0,
    categoria_estado VARCHAR(20) DEFAULT 'activo' CHECK (categoria_estado IN ('activo', 'inactivo')),
    categoria_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Producto
CREATE TABLE producto (
    producto_id SERIAL PRIMARY KEY,
    categoria_id INTEGER NOT NULL REFERENCES categoria(categoria_id) ON DELETE RESTRICT,
    proveedor_id INTEGER NULL REFERENCES proveedor(proveedor_id) ON DELETE SET NULL,
    producto_codigo VARCHAR(50) UNIQUE NOT NULL,
    producto_nombre VARCHAR(200) NOT NULL,
    producto_descripcion TEXT NULL,
    producto_precio NUMERIC(10,2) NOT NULL DEFAULT 0,
    producto_precio_compra NUMERIC(10,2) NOT NULL DEFAULT 0,
    producto_stock INTEGER NOT NULL DEFAULT 0,
    producto_foto VARCHAR(255) NULL,
    producto_fecha_vencimiento DATE NULL,
    producto_estado VARCHAR(20) DEFAULT 'activo' CHECK (producto_estado IN ('activo', 'inactivo')),
    producto_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    producto_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Empleado
CREATE TABLE empleado (
    empleado_id SERIAL PRIMARY KEY,
    departamento_id INTEGER NULL REFERENCES departamento(departamento_id) ON DELETE SET NULL,
    centro_costos_id INTEGER NULL REFERENCES centro_costos(centro_costos_id) ON DELETE SET NULL,
    empleado_cedula VARCHAR(20) UNIQUE NOT NULL,
    empleado_nombre VARCHAR(100) NOT NULL,
    empleado_apellido VARCHAR(100) NOT NULL,
    empleado_foto VARCHAR(255) NULL,
    empleado_email VARCHAR(100) NULL,
    empleado_cargo VARCHAR(100) NULL,
    empleado_estado VARCHAR(20) DEFAULT 'activo' CHECK (empleado_estado IN ('activo', 'inactivo')),
    empleado_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    empleado_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    empleado_fecha_desactivacion TIMESTAMP NULL
);

-------- Rol
CREATE TABLE rol (
    rol_id SERIAL PRIMARY KEY,
    rol_nombre VARCHAR(50) UNIQUE NOT NULL,
    rol_descripcion VARCHAR(255) NULL,
    rol_estado VARCHAR(20) DEFAULT 'activo' CHECK (rol_estado IN ('activo', 'inactivo'))
);

-------- Modulo
CREATE TABLE modulo (
    modulo_id SERIAL PRIMARY KEY,
    modulo_padre_id INTEGER NULL REFERENCES modulo(modulo_id) ON DELETE RESTRICT,
    modulo_nombre VARCHAR(50) UNIQUE NOT NULL,
    modulo_descripcion VARCHAR(255) NULL,
    modulo_icono VARCHAR(50) NULL,
    modulo_orden INTEGER DEFAULT 0,
    modulo_estado VARCHAR(20) DEFAULT 'activo' CHECK (modulo_estado IN ('activo', 'inactivo')),
    modulo_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modulo_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Permiso
CREATE TABLE permiso (
    permiso_id SERIAL PRIMARY KEY,
    modulo_id INTEGER NOT NULL REFERENCES modulo(modulo_id) ON DELETE CASCADE,
    permiso_nombre VARCHAR(100) UNIQUE NOT NULL,
    permiso_descripcion VARCHAR(255) NULL,
    permiso_clave VARCHAR(50) NOT NULL, -- Ej: ver, crear, editar, eliminar
    permiso_estado VARCHAR(20) DEFAULT 'activo' CHECK (permiso_estado IN ('activo', 'inactivo')),
    permiso_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    permiso_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Usuario (depende de Empleado, pero puede ser NULL)
CREATE TABLE usuario (
    usuario_id SERIAL PRIMARY KEY,
    empleado_id INTEGER NULL REFERENCES empleado(empleado_id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(100) NOT NULL,
    usuario_email VARCHAR(100) UNIQUE NOT NULL,
    usuario_password VARCHAR(255) NOT NULL,
    usuario_estado VARCHAR(20) DEFAULT 'activo' CHECK (usuario_estado IN ('activo', 'inactivo')),
    usuario_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_fecha_desactivacion TIMESTAMP NULL
);


-- =============================================
-- 3. TABLAS INTERMEDIAS (N:N)
-- =============================================

-------- Usuario_Rol
CREATE TABLE usuario_rol (
    usuario_rol_id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    rol_id INTEGER NOT NULL REFERENCES rol(rol_id) ON DELETE CASCADE,
    UNIQUE (usuario_id, rol_id)
);

-------- Rol_Permiso
CREATE TABLE rol_permiso (
    rol_permiso_id SERIAL PRIMARY KEY,
    rol_id INTEGER NOT NULL REFERENCES rol(rol_id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permiso(permiso_id) ON DELETE CASCADE,
    UNIQUE (rol_id, permiso_id)
);


-- =============================================
-- 4. TABLAS DE TRANSACCIONES Y MOVIMIENTOS
-- =============================================

-------- Venta
CREATE TABLE venta (
    venta_id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
    empleado_id INTEGER NULL REFERENCES empleado(empleado_id) ON DELETE SET NULL,
    usuario_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
    venta_fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    venta_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    venta_estado VARCHAR(20) DEFAULT 'completada' CHECK (venta_estado IN ('completada', 'cancelada')),
    venta_observacion VARCHAR(255) NULL
);

-------- Venta_Detalle
CREATE TABLE venta_detalle (
    venta_detalle_id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES venta(venta_id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES producto(producto_id) ON DELETE RESTRICT,
    venta_detalle_cantidad INTEGER NOT NULL CHECK (venta_detalle_cantidad > 0),
    venta_detalle_precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    venta_detalle_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
);

-------- Solicitud_Entrega
CREATE TABLE solicitud_entrega (
    solicitud_entrega_id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL REFERENCES empleado(empleado_id) ON DELETE RESTRICT,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
    solicitud_entrega_codigo VARCHAR(20) UNIQUE NOT NULL,
    solicitud_entrega_fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    solicitud_entrega_fecha_entrega TIMESTAMP NULL,
    solicitud_entrega_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (solicitud_entrega_estado IN ('pendiente', 'entregado', 'no_entregado', 'cancelado')),
    solicitud_entrega_observacion VARCHAR(255) NULL,
    usuario_entrega_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
    solicitud_entrega_foto_entrega VARCHAR(255) NULL
);

-------- Solicitud_Entrega_Detalle
CREATE TABLE solicitud_entrega_detalle (
    solicitud_entrega_detalle_id SERIAL PRIMARY KEY,
    solicitud_entrega_id INTEGER NOT NULL REFERENCES solicitud_entrega(solicitud_entrega_id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES producto(producto_id) ON DELETE RESTRICT,
    solicitud_entrega_detalle_cantidad INTEGER NOT NULL CHECK (solicitud_entrega_detalle_cantidad > 0),
    solicitud_entrega_detalle_precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0
);

-------- Orden_Compra
CREATE TABLE orden_compra (
    orden_compra_id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresa(empresa_id) ON DELETE RESTRICT,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
    departamento_id INTEGER NOT NULL REFERENCES departamento(departamento_id) ON DELETE RESTRICT,
    empleado_id INTEGER NOT NULL REFERENCES empleado(empleado_id) ON DELETE RESTRICT,
    centro_costos_id INTEGER NOT NULL REFERENCES centro_costos(centro_costos_id) ON DELETE RESTRICT,
    proveedor_id INTEGER NULL REFERENCES proveedor(proveedor_id) ON DELETE SET NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE RESTRICT, -- Usuario STOCK que generó

    -- Códigos y fechas
    orden_compra_codigo VARCHAR(50) UNIQUE NOT NULL,
    orden_compra_fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    orden_compra_fecha_entrega_estimada DATE NULL,
    orden_compra_fecha_aprobacion TIMESTAMP NULL,
    orden_compra_fecha_compra TIMESTAMP NULL,
    orden_compra_fecha_recepcion TIMESTAMP NULL,

    -- Datos del formulario
    orden_compra_justificacion TEXT NOT NULL,
    orden_compra_tipo_articulo VARCHAR(50) NOT NULL CHECK (orden_compra_tipo_articulo IN ('MATERIA PRIMA', 'HERRAMIENTA', 'SERVICIO', 'MAQUINARIA O EQUIPO', 'SUMINISTROS/ CONSUMIBLES', 'OTROS')),
    orden_compra_negociacion_previa VARCHAR(20) DEFAULT 'NO' CHECK (orden_compra_negociacion_previa IN ('SI', 'NO')),
    orden_compra_forma_pago VARCHAR(50) NULL,
    orden_compra_plazo_pago VARCHAR(50) NULL,
    orden_compra_tiempo_entrega VARCHAR(50) NULL,
    orden_compra_lugar_recepcion VARCHAR(255) NULL,
    orden_compra_tipo_compra VARCHAR(20) NOT NULL DEFAULT 'LOCAL' CHECK (orden_compra_tipo_compra IN ('LOCAL', 'INTERNACIONAL')),

    -- Características específicas
    orden_compra_requiere_contrato BOOLEAN DEFAULT FALSE,
    orden_compra_requiere_seguro BOOLEAN DEFAULT FALSE,
    orden_compra_requiere_mantenimiento BOOLEAN DEFAULT FALSE,
    orden_compra_asignado_trabajador BOOLEAN DEFAULT FALSE,
    orden_compra_trabajador_asignado VARCHAR(200) NULL,
    orden_compra_caracteristicas TEXT NULL,
    orden_compra_elaborado_por VARCHAR(200) NULL,
    orden_compra_aprobado_por VARCHAR(200) NULL,
    orden_compra_recibido_por VARCHAR(200) NULL,

    -- Estados y aprobaciones
    orden_compra_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (orden_compra_estado IN ('pendiente', 'aprobada', 'rechazada', 'comprada', 'recibida', 'cancelada', 'entregado')),
    orden_compra_observacion TEXT NULL,

    -- Usuarios que participan en el flujo
    usuario_aprobador_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
    usuario_comprador_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
    usuario_receptor_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,

    -- Auditoría
    orden_compra_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    orden_compra_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    orden_compra_fecha_desactivacion TIMESTAMP NULL
);

-------- Orden_Compra_Detalle
CREATE TABLE orden_compra_detalle (
    orden_compra_detalle_id SERIAL PRIMARY KEY,
    orden_compra_id INTEGER NOT NULL REFERENCES orden_compra(orden_compra_id) ON DELETE CASCADE,
    producto_id INTEGER NULL REFERENCES producto(producto_id) ON DELETE SET NULL,
    proveedor_id INTEGER NULL REFERENCES proveedor(proveedor_id) ON DELETE SET NULL,

    orden_compra_detalle_descripcion VARCHAR(255) NOT NULL,
    orden_compra_detalle_cantidad INTEGER NOT NULL CHECK (orden_compra_detalle_cantidad > 0),
    orden_compra_detalle_unidad_medida VARCHAR(20) NOT NULL,
    orden_compra_detalle_precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    orden_compra_detalle_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    orden_compra_detalle_foto VARCHAR(255) NULL,
    orden_compra_detalle_negociacion_previa VARCHAR(20) DEFAULT 'NO' CHECK (orden_compra_detalle_negociacion_previa IN ('SI', 'NO')),
    orden_compra_detalle_comentario VARCHAR(255) NULL,

    orden_compra_detalle_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    orden_compra_detalle_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Orden_Compra_Factura
CREATE TABLE orden_compra_factura (
    orden_compra_factura_id SERIAL PRIMARY KEY,
    orden_compra_id INTEGER NOT NULL REFERENCES orden_compra(orden_compra_id) ON DELETE CASCADE,
    factura_codigo VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------- Devolucion
CREATE TABLE devolucion (
    devolucion_id SERIAL PRIMARY KEY,
    solicitud_entrega_id INTEGER NOT NULL REFERENCES solicitud_entrega(solicitud_entrega_id) ON DELETE RESTRICT,
    empleado_id INTEGER NOT NULL REFERENCES empleado(empleado_id) ON DELETE RESTRICT,
    usuario_entrega_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
    usuario_tthh_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,

    devolucion_fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    devolucion_fecha_aprobacion TIMESTAMP NULL,
    devolucion_fecha_ejecucion TIMESTAMP NULL,

    devolucion_motivo TEXT NOT NULL,
    devolucion_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (devolucion_estado IN ('pendiente', 'aprobado', 'rechazado', 'ejecutado')),
    devolucion_observacion_tthh TEXT NULL,
    devolucion_foto_evidencia VARCHAR(255) NULL
);

-------- Devolucion_Detalle
CREATE TABLE devolucion_detalle (
    devolucion_detalle_id SERIAL PRIMARY KEY,
    devolucion_id INTEGER NOT NULL REFERENCES devolucion(devolucion_id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES producto(producto_id) ON DELETE RESTRICT,
    cantidad_devuelta INTEGER NOT NULL CHECK (cantidad_devuelta > 0)
);

-------- Descuento_Nomina
CREATE TABLE descuento_nomina (
    descuento_nomina_id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL REFERENCES empleado(empleado_id) ON DELETE RESTRICT,
    periodo_descuento VARCHAR(7) NOT NULL CHECK (periodo_descuento ~ '^\d{4}-\d{2}$'), -- Formato YYYY-MM
    descuento_nomina_monto_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento_nomina_descripcion TEXT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE RESTRICT,
    descuento_nomina_fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descuento_nomina_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (descuento_nomina_estado IN ('pendiente', 'aplicado'))
);

-------- Descuento_Nomina_Detalle
CREATE TABLE descuento_nomina_detalle (
    descuento_nomina_detalle_id SERIAL PRIMARY KEY,
    descuento_nomina_id INTEGER NOT NULL REFERENCES descuento_nomina(descuento_nomina_id) ON DELETE CASCADE,
    solicitud_entrega_id INTEGER NOT NULL REFERENCES solicitud_entrega(solicitud_entrega_id) ON DELETE RESTRICT,
    descuento_nomina_detalle_monto NUMERIC(10,2) NOT NULL DEFAULT 0
);

-------- Movimiento_Inventario
CREATE TABLE movimiento_inventario (
    movimiento_inventario_id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES producto(producto_id) ON DELETE RESTRICT,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
    usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE RESTRICT,

    movimiento_inventario_tipo VARCHAR(30) NOT NULL CHECK (movimiento_inventario_tipo IN ('entrada', 'salida', 'ajuste', 'devolucion_entrada', 'devolucion_salida', 'orden_compra')),
    movimiento_inventario_cantidad INTEGER NOT NULL,
    movimiento_inventario_stock_anterior INTEGER NOT NULL DEFAULT 0,
    movimiento_inventario_stock_nuevo INTEGER NOT NULL DEFAULT 0,
    movimiento_inventario_fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    movimiento_inventario_observacion TEXT NULL,

    solicitud_entrega_id INTEGER NULL REFERENCES solicitud_entrega(solicitud_entrega_id) ON DELETE SET NULL,
    venta_id INTEGER NULL REFERENCES venta(venta_id) ON DELETE SET NULL,
    orden_compra_id INTEGER NULL REFERENCES orden_compra(orden_compra_id) ON DELETE SET NULL
);

-------- Reporte
CREATE TABLE reporte (
    reporte_id SERIAL PRIMARY KEY,
    reporte_nombre VARCHAR(100) NOT NULL,
    reporte_descripcion VARCHAR(255) NULL,
    reporte_tipo VARCHAR(50) NOT NULL,
    reporte_fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE RESTRICT,
    reporte_archivo VARCHAR(255) NULL,
    reporte_parametros JSONB NULL
);


-- =============================================
-- 5. ÍNDICES RECOMENDADOS (PARA RENDIMIENTO)
-- =============================================

-- Para búsquedas por cédula de empleado
CREATE INDEX idx_empleado_cedula ON empleado(empleado_cedula);

-- Para búsquedas por estado en solicitudes
CREATE INDEX idx_solicitud_entrega_estado ON solicitud_entrega(solicitud_entrega_estado);
CREATE INDEX idx_solicitud_entrega_codigo ON solicitud_entrega(solicitud_entrega_codigo);

-- Para búsquedas por fechas en órdenes de compra
CREATE INDEX idx_orden_compra_fecha_solicitud ON orden_compra(orden_compra_fecha_solicitud);
CREATE INDEX idx_orden_compra_estado ON orden_compra(orden_compra_estado);

-- Para movimientos de inventario por producto
CREATE INDEX idx_movimiento_inventario_producto ON movimiento_inventario(producto_id);
CREATE INDEX idx_movimiento_inventario_fecha ON movimiento_inventario(movimiento_inventario_fecha);

-- Para ventas por fecha
CREATE INDEX idx_venta_fecha ON venta(venta_fecha);

-- Para devoluciones por estado
CREATE INDEX idx_devolucion_estado ON devolucion(devolucion_estado);

-- Para descuentos por período
CREATE INDEX idx_descuento_nomina_periodo ON descuento_nomina(periodo_descuento);

-- Para el login de usuario
CREATE INDEX idx_usuario_email ON usuario(usuario_email);

-- Para busqueda de departamentos por código
CREATE INDEX idx_departamento_codigo ON departamento(departamento_codigo);

-- Para busqueda de empresas por código
CREATE INDEX idx_empresa_codigo ON empresa(empresa_codigo);

-- =============================================
-- 6. DATOS SEMILLA INICIALES (DATOS ESENCIALES)
-- =============================================

-- 6.1 Empresa y Sucursal
INSERT INTO empresa (empresa_id, empresa_codigo, empresa_ruc, empresa_razon_social, empresa_nombre_comercial, empresa_estado) 
VALUES (1, 'STI', '1790000000001', 'ST INNOVA S.A.', 'stinnova', 'activo')
ON CONFLICT (empresa_ruc) DO NOTHING;

INSERT INTO sucursal (sucursal_id, empresa_id, sucursal_nombre, sucursal_estado)
VALUES (1, 1, 'Sucursal Matriz', 'activo')
ON CONFLICT DO NOTHING;

-- 6.2 Centro de Costos y Departamento
INSERT INTO centro_costos (centro_costos_id, centro_costos_codigo, centro_costos_nombre, centro_costos_estado)
VALUES (1, '01.05.04.04', 'TIC', 'activo')
ON CONFLICT (centro_costos_codigo) DO NOTHING;

INSERT INTO departamento (departamento_id, centro_costos_id, sucursal_id, departamento_codigo, departamento_nombre, departamento_estado)
VALUES (1, 1, 1, 'TIC', 'TIC', 'activo')
ON CONFLICT (departamento_codigo) DO NOTHING;

-- 6.3 Roles del Sistema
INSERT INTO rol (rol_id, rol_nombre, rol_descripcion, rol_estado) 
VALUES 
(1, 'admin', 'Administrador del sistema con acceso total', 'activo'),
(2, 'guardia', 'Encargado de entregas y verificación de empleados', 'activo'),
(3, 'empleado', 'Empleado que puede realizar compras', 'activo'),
(4, 'inventario', 'Encargado de gestión de inventario', 'activo'),
(5, 'gerente', 'Gerente general', 'activo'),
(6, 'contador', 'Contabilidad', 'activo'),
(7, 'tthh', 'Talento Humano', 'activo')
ON CONFLICT (rol_nombre) DO NOTHING;

-- Ajustar secuencias
SELECT setval('empresa_empresa_id_seq', COALESCE((SELECT MAX(empresa_id)+1 FROM empresa), 1), false);
SELECT setval('sucursal_sucursal_id_seq', COALESCE((SELECT MAX(sucursal_id)+1 FROM sucursal), 1), false);
SELECT setval('centro_costos_centro_costos_id_seq', COALESCE((SELECT MAX(centro_costos_id)+1 FROM centro_costos), 1), false);
SELECT setval('departamento_departamento_id_seq', COALESCE((SELECT MAX(departamento_id)+1 FROM departamento), 1), false);
SELECT setval('rol_rol_id_seq', COALESCE((SELECT MAX(rol_id)+1 FROM rol), 1), false);

-- 6.4 Empleado de Administración por Defecto
INSERT INTO empleado (empleado_id, departamento_id, centro_costos_id, empleado_cedula, empleado_nombre, empleado_apellido, empleado_cargo, empleado_estado)
VALUES (1, 1, 1, '1751992817', 'Kevin David', 'Ortega Jara', 'Pasante TICS', 'activo')
ON CONFLICT (empleado_cedula) DO NOTHING;

SELECT setval('empleado_empleado_id_seq', COALESCE((SELECT MAX(empleado_id)+1 FROM empleado), 1), false);

-- 6.5 Usuario Administrador por Defecto (Contraseña: admin123)
INSERT INTO usuario (usuario_id, empleado_id, usuario_nombre, usuario_email, usuario_password, usuario_estado)
VALUES (1, 1, 'Administrador', 'admin@stdrive.com', '$2a$10$zPT2uTjkNk/Fepmf1oNsP.EAI14Pg1rqgHGBFeJ9MnrQm1gHxcGYa', 'activo')
ON CONFLICT (usuario_email) DO NOTHING;

SELECT setval('usuario_usuario_id_seq', COALESCE((SELECT MAX(usuario_id)+1 FROM usuario), 1), false);

-- 6.6 Asignar Rol Admin a Usuario Administrador
INSERT INTO usuario_rol (usuario_id, rol_id)
VALUES (1, 1)
ON CONFLICT (usuario_id, rol_id) DO NOTHING;
