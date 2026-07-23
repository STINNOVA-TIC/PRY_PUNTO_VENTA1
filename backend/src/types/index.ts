export interface IUsuario {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol_id: number;
  activo: boolean;
  fecha_creacion: Date;
  ultimo_acceso?: Date;
  intentos_fallidos?: number;
  bloqueado_hasta?: Date;
}

export interface IEmpleado {
  id: number;
  usuario_id?: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  fecha_contrato: Date;
  departamento: string;
  cargo: string;
  tipo_contrato: string;
  saldo_disponible?: number;
  limite_credito?: number;
  foto_perfil?: string;
  activo: boolean;
}

export interface IProducto {
  id: number;
  codigo_barras: string;
  nombre: string;
  descripcion: string;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: number;
  proveedor_id: number;
  activo: boolean;
  fecha_creacion: Date;
}

export interface IVenta {
  id: number;
  empleado_id: number;
  fecha: Date;
  total_bruto: number;
  descuento_total: number;
  total_neto: number;
  estado: 'pendiente' | 'completada' | 'anulada';
  metodo_pago: 'efectivo' | 'nomina' | 'tarjeta';
  estado_entrega: 'pendiente' | 'en_almacen' | 'entregado' | 'cancelado';
  entregado_por?: number;
  fecha_entrega?: Date;
}

export interface IDetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento_aplicado: number;
  subtotal: number;
}

export interface ISolicitudEntrega {
  id: number;
  venta_id: number;
  empleado_id: number;
  producto_id: number;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  estado: 'pendiente' | 'parcial' | 'completada' | 'cancelada' | 'retenida';
  fecha_solicitud: Date;
  fecha_entrega?: Date;
  entregado_por?: number;
  observaciones?: string;
}

export interface IVerificacionEntrega {
  id: number;
  solicitud_id: number;
  empleado_verificado_id: number;
  guardia_id: number;
  metodo_verificacion: 'documento_fisico' | 'qr_code' | 'huella' | 'validacion_manual';
  estado_verificacion: 'exitosa' | 'fallida' | 'pendiente';
  fecha_verificacion: Date;
  observaciones?: string;
}

export interface IRol {
  id: number;
  nombre: 'admin' | 'guardia' | 'empleado' | 'inventario';
  descripcion: string;
  permisos: {
    gestionar_usuarios?: boolean;
    gestionar_productos?: boolean;
    gestionar_inventario?: boolean;
    gestionar_empleados?: boolean;
    realizar_ventas?: boolean;
    gestionar_entregas?: boolean;
    ver_reportes?: boolean;
    ver_reportes_financieros?: boolean;
    ver_datos_empleados?: boolean;
  };
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: IRol;
    empleado?: IEmpleado;
  };
}

export interface ICreateVentaRequest {
  empleado_id: number;
  productos: Array<{
    producto_id: number;
    cantidad: number;
  }>;
  metodo_pago: 'efectivo' | 'nomina' | 'tarjeta';
}

export interface IConfirmarEntregaRequest {
  solicitud_id: number;
  guardia_id: number;
  metodo_verificacion: 'documento_fisico' | 'qr_code' | 'huella' | 'validacion_manual';
  observaciones?: string;
}

// backend/src/types/index.ts

// ... (todo lo que ya tenías)

// ============ ENTREGAS ============
export interface ISolicitudEntrega {
  id: number;
  venta_id: number;
  empleado_id: number;
  producto_id: number;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  estado: 'pendiente' | 'parcial' | 'completada' | 'cancelada' | 'retenida';
  fecha_solicitud: Date;
  fecha_entrega?: Date;
  entregado_por?: number;
  observaciones?: string;
  prioridad?: 'normal' | 'alta' | 'urgente';
}

export interface IVerificacionEntrega {
  id: number;
  solicitud_id: number;
  empleado_verificado_id: number;
  guardia_id: number;
  metodo_verificacion: 'documento_fisico' | 'qr_code' | 'huella' | 'validacion_manual';
  estado_verificacion: 'exitosa' | 'fallida' | 'pendiente';
  fecha_verificacion: Date;
  observaciones?: string;
}

export interface IConfirmarEntregaRequest {
  solicitud_id: number;
  guardia_id: number;
  metodo_verificacion: 'documento_fisico' | 'qr_code' | 'huella' | 'validacion_manual';
  observaciones?: string;
}