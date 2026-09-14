import React from 'react';
import { Permiso } from '../../types/permisos';

export interface MetricaDef {
  id: string;
  titulo: string;
  valor: string | number;
  subtitulo: string;
  icono: React.ReactNode;
  color: string;
  bgLight: string;
  borderColor: string;
  ruta: string;
  permisosRequeridos: Permiso[];
  rolesPermitidos?: string[];
}

export interface AccesoRapidoItem {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: React.ReactNode;
  badge?: string;
}

export interface TopProductoItem {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface ConsumoDeptoItem {
  depto: string;
  total: number;
  porcentaje: number;
}

export interface ConsumoTemporalItem {
  label: string;
  fecha?: string;
  total: number;
}

export interface EventoActividad {
  id: string;
  tipo: 'entrega' | 'autoconsumo' | 'devolucion' | 'inventario' | 'alerta';
  titulo: string;
  descripcion: string;
  tiempo: string;
  fechaISO: string;
  estado?: string;
  badge?: string;
}

