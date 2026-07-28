import api from './auth.api';
import { Autoconsumo } from '../types';

export const autoconsumoAPI = {
  getAll: async (): Promise<{ success: boolean; data: Autoconsumo[] }> => {
    const response = await api.get('/autoconsumos');
    return response.data;
  },

  getById: async (id: string | number): Promise<{ success: boolean; data: Autoconsumo }> => {
    const response = await api.get(`/autoconsumos/${id}`);
    return response.data;
  },

  crear: async (payload: {
    empleado_id: number;
    departamento_id: number;
    centro_costos_id?: number;
    justificacion: string;
    productos: { producto_id: number; cantidad: number }[];
  }): Promise<{ success: boolean; data: { id: number; codigo: string }; message: string }> => {
    const response = await api.post('/autoconsumos', payload);
    return response.data;
  },

  aprobar: async (id: number, observacion?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/autoconsumos/${id}/aprobar`, { observacion });
    return response.data;
  },

  entregar: async (id: number, payload: {
    observacion?: string;
    foto_entrega?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/autoconsumos/${id}/entregar`, payload);
    return response.data;
  },

  cancelar: async (id: number, payload?: {
    observacion?: string;
    esRechazo?: boolean;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/autoconsumos/${id}/cancelar`, payload);
    return response.data;
  }
};
