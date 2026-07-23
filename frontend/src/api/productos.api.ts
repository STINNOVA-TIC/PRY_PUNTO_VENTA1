import api from './auth.api';
import { Producto } from '../types';

export const productosAPI = {
  getAll: async (): Promise<{ data: Producto[] }> => {
    const response = await api.get('/productos');
    return response.data;
  },

  getById: async (id: number | string): Promise<{ data: any }> => {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },

  create: async (data: { 
    codigo_barras: string; 
    nombre: string; 
    descripcion: string; 
    precio_costo: number; 
    precio_venta: number; 
    stock_actual: number; 
    categoria_id: number;
    proveedor_id: number;
    foto?: string;
  }) => {
    const response = await api.post('/productos', data);
    return response.data;
  },

  updateStock: async (id: number, stock: number) => {
    const response = await api.patch(`/productos/${id}/stock`, { stock });
    return response.data;
  },

  getCategorias: async (): Promise<{ data: { id: number; nombre: string }[] }> => {
    const response = await api.get('/productos/categorias');
    return response.data;
  },

  getProveedores: async (): Promise<{ data: { id: number; nombre: string }[] }> => {
    const response = await api.get('/productos/proveedores');
    return response.data;
  }
};
