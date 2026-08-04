import { Permiso } from './permisos';
export type { Permiso };

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: {
    id: number;
    nombre: string;
    permisos: Permiso[];
  };
  permitir_autoconsumo?: boolean;
  empleado?: {
    id: number;
    codigo_empleado: string;
    nombre: string;
    apellido: string;
    departamento: string;
    centro_costos?: string;
    cargo: string;
    foto_perfil?: string;
    saldo_disponible?: number;
    limite_credito?: number;
  };
}

export interface Empleado {
  id: number;
  usuario_id?: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  fecha_contrato: Date;
  departamento: string;
  centro_costos?: string;
  cargo: string;
  tipo_contrato: string;
  saldo_disponible?: number;
  limite_credito?: number;
  foto_perfil?: string;
  firma?: string;
  email?: string;
  departamento_id?: number;
  centro_costos_id?: number;
  activo: boolean;
  permitir_autoconsumo?: boolean;
}

export interface Producto {
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
  foto?: string;
  fecha_creacion: Date;
}

export interface Venta {
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
  empleado?: Empleado;
  detalles?: DetalleVenta[];
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento_aplicado: number;
  subtotal: number;
  producto?: Producto;
}

export interface SolicitudEntrega {
  id: number;
  codigo_entrega?: string;
  venta_id: number;
  empleado_id: number;
  producto_id: number;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  estado: 'pendiente' | 'parcial' | 'completada' | 'cancelada' | 'retenida' | 'entregado' | 'no_entregado';
  fecha_solicitud: Date;
  fecha_entrega?: Date;
  entregado_por?: number;
  observaciones?: string;
  prioridad?: 'normal' | 'alta' | 'urgente';
  empleado?: Empleado;
  producto?: Producto;
  devolucion_estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'ejecutado' | null;
}

export interface VerificacionEntrega {
  id: number;
  solicitud_id: number;
  empleado_verificado_id: number;
  guardia_id: number;
  metodo_verificacion: 'documento_fisico' | 'qr_code' | 'huella' | 'validacion_manual';
  estado_verificacion: 'exitosa' | 'fallida' | 'pendiente';
  fecha_verificacion: Date;
  observaciones?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    usuario: Usuario;
  };
  message: string;
}

export interface CreateVentaRequest {
  empleado_id: number;
  productos: Array<{
    producto_id: number;
    cantidad: number;
  }>;
  metodo_pago: 'efectivo' | 'nomina' | 'tarjeta';
}

export interface ConfirmarEntregaRequest {
  solicitud_id: number;
  guardia_id: number;
  metodo_verificacion: 'documento_fisico' | 'qr_code' | 'huella' | 'validacion_manual';
  observaciones?: string;
  foto_entrega?: string;
}

export interface AutoconsumoDetalle {
  id: number;
  producto_id: number;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Autoconsumo {
  id: number;
  codigo: string;
  justificacion: string;
  estado: 'pendiente' | 'aprobado' | 'entregado' | 'rechazado' | 'cancelado';
  fecha_solicitud: string;
  fecha_entrega?: string;
  fecha_aprobacion?: string;
  observacion?: string;
  foto_entrega?: string;
  aprobador?: string;
  despachador?: string;
  devolucion?: {
    id: number;
    estado: string;
  } | null;
  empleado: {
    id: number;
    nombre: string;
    cedula: string;
  };
  departamento: {
    id: number;
    nombre: string;
  };
  centro_costos: {
    id: number;
    nombre: string;
    codigo: string;
  };
  detalles: AutoconsumoDetalle[];
}

