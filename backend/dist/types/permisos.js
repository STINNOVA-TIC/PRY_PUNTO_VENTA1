"use strict";
// backend/src/types/permisos.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GruposPermisos = void 0;
// Grupos de permisos para facilitar la asignación
exports.GruposPermisos = {
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
    ],
    // GUARDIA: Solo entregas y verificación
    GUARDIA: [
        'empleados.ver', // Solo nombre, foto, departamento (datos básicos)
        'empleados.ver_historial_compras',
        'entregas.ver',
        'entregas.ver_pendientes',
        'entregas.confirmar',
        'entregas.verificar_empleado',
        'entregas.reportar_incidente',
        'reportes.ver',
        'reportes.ver_consumo_empleados',
        'inventario.ver', // Para ubicar productos en stock
        'productos.ver' // Para ver detalles del producto a entregar
    ],
    // EMPLEADO: Compras y ver propio consumo
    EMPLEADO: [
        'ventas.realizar',
        'ventas.ver_propias',
        'empleados.ver', // Solo su propia información
        'productos.ver', // Para ver catálogo
        'entregas.ver', // Para ver estado de sus entregas
        'inventario.ver', // Para ver disponibilidad
        'reportes.ver_consumo_empleados', // Solo su propio consumo
        'nomina.ver_propia'
    ],
    // INVENTARIO: Gestión de productos y stock
    INVENTARIO: [
        'productos.ver', 'productos.crear', 'productos.editar', 'productos.activar',
        'productos.desactivar',
        'inventario.ver', 'inventario.ver_movimientos', 'inventario.ajustar_stock',
        'inventario.ingresar_mercancia', 'inventario.ver_costos',
        'reportes.ver', 'reportes.ver_inventario', 'reportes.exportar',
        'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
        'categorias.ver', 'categorias.crear', 'categorias.editar'
    ],
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
    ]
};
