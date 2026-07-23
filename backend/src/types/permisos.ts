// backend/src/types/permisos.ts

export type Permiso =
  // ============ USUARIOS ============
  | 'usuarios.ver'
  | 'usuarios.crear'
  | 'usuarios.editar'
  | 'usuarios.eliminar'
  | 'usuarios.activar'
  | 'usuarios.desactivar'
  
  // ============ ROLES ============
  | 'roles.ver'
  | 'roles.crear'
  | 'roles.editar'
  | 'roles.eliminar'
  
  // ============ EMPLEADOS ============
  | 'empleados.ver'
  | 'empleados.ver_datos_sensibles'  // Salario, datos personales completos
  | 'empleados.crear'
  | 'empleados.editar'
  | 'empleados.eliminar'
  | 'empleados.activar'
  | 'empleados.desactivar'
  | 'empleados.ver_historial_compras'
  
  // ============ PRODUCTOS ============
  | 'productos.ver'
  | 'productos.crear'
  | 'productos.editar'
  | 'productos.eliminar'
  | 'productos.activar'
  | 'productos.desactivar'
  
  // ============ INVENTARIO ============
  | 'inventario.ver'
  | 'inventario.ver_movimientos'
  | 'inventario.ajustar_stock'
  | 'inventario.ingresar_mercancia'
  | 'inventario.ver_costos'
  
  // ============ VENTAS ============
  | 'ventas.realizar'
  | 'ventas.ver'
  | 'ventas.ver_propias'
  | 'ventas.anular'
  | 'ventas.cancelar'
  
  // ============ ENTREGAS ============
  | 'entregas.ver'
  | 'entregas.ver_pendientes'
  | 'entregas.confirmar'
  | 'entregas.verificar_empleado'
  | 'entregas.reportar_incidente'
  
  // ============ REPORTES ============
  | 'reportes.ver'
  | 'reportes.ver_financieros'
  | 'reportes.ver_consumo_empleados'
  | 'reportes.ver_inventario'
  | 'reportes.exportar'
  
  // ============ NÓMINA ============
  | 'nomina.ver'
  | 'nomina.ver_propia'
  | 'nomina.ver_todos'
  | 'nomina.aplicar_descuento'
  | 'nomina.configurar_descuentos'
  
  // ============ CONFIGURACIÓN ============
  | 'configuracion.ver'
  | 'configuracion.editar'
  | 'configuracion.ver_logs';

// Grupos de permisos para facilitar la asignación
export const GruposPermisos = {
  // ADMIN: Acceso total
  ADMIN: [
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar', 
    'usuarios.activar', 'usuarios.desactivar',
    'roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar',
    'empleados.ver', 'empleados.ver_datos_sensibles', 'empleados.crear', 
    'empleados.editar', 'empleados.eliminar', 'empleados.activar', 
    'empleados.desactivar', 'empleados.ver_historial_compras',
    'productos.ver', 'productos.crear', 'productos.editar', 'productos.eliminar',
    'productos.activar', 'productos.desactivar',
    'inventario.ver', 'inventario.ver_movimientos', 'inventario.ajustar_stock',
    'inventario.ingresar_mercancia', 'inventario.ver_costos',
    'ventas.realizar', 'ventas.ver', 'ventas.anular', 'ventas.cancelar',
    'entregas.ver', 'entregas.ver_pendientes', 'entregas.confirmar',
    'entregas.verificar_empleado', 'entregas.reportar_incidente',
    'reportes.ver', 'reportes.ver_financieros', 'reportes.ver_consumo_empleados',
    'reportes.ver_inventario', 'reportes.exportar',
    'nomina.ver', 'nomina.ver_todos', 'nomina.aplicar_descuento',
    'nomina.configurar_descuentos',
    'configuracion.ver', 'configuracion.editar', 'configuracion.ver_logs'
  ] as Permiso[],

  // GUARDIA: Solo entregas y verificación
  GUARDIA: [
    'empleados.ver',  // Solo nombre, foto, departamento (datos básicos)
    'empleados.ver_historial_compras',
    'entregas.ver',
    'entregas.ver_pendientes',
    'entregas.confirmar',
    'entregas.verificar_empleado',
    'entregas.reportar_incidente',
    'reportes.ver',
    'reportes.ver_consumo_empleados',
    'inventario.ver',  // Para ubicar productos en stock
    'productos.ver'    // Para ver detalles del producto a entregar
  ] as Permiso[],

  // EMPLEADO: Compras y ver propio consumo
  EMPLEADO: [
    'ventas.realizar',
    'ventas.ver_propias',
    'empleados.ver',  // Solo su propia información
    'productos.ver',  // Para ver catálogo
    'entregas.ver',   // Para ver estado de sus entregas
    'inventario.ver', // Para ver disponibilidad
    'reportes.ver_consumo_empleados', // Solo su propio consumo
    'nomina.ver_propia'
  ] as Permiso[],

  // INVENTARIO: Gestión de productos y stock
  INVENTARIO: [
    'productos.ver', 'productos.crear', 'productos.editar', 'productos.activar', 
    'productos.desactivar',
    'inventario.ver', 'inventario.ver_movimientos', 'inventario.ajustar_stock',
    'inventario.ingresar_mercancia', 'inventario.ver_costos',
    'reportes.ver', 'reportes.ver_inventario', 'reportes.exportar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'categorias.ver', 'categorias.crear', 'categorias.editar'
  ] as Permiso[],

  // TTHH: Gestión de nómina, devoluciones y gastos de empleados
  TTHH: [
    'reportes.ver',
    'reportes.ver_consumo_empleados',
    'nomina.ver',
    'nomina.ver_todos',
    'nomina.aplicar_descuento',
    'nomina.configurar_descuentos',
    'empleados.ver',
    'empleados.ver_datos_sensibles'
  ] as Permiso[]
};