import api from './auth.api';
import { SolicitudEntrega, ConfirmarEntregaRequest } from '../types';

export const entregasAPI = {
  getAll: async (): Promise<{ data: SolicitudEntrega[] }> => {
    const response = await api.get('/entregas');
    return response.data;
  },

  getPendientes: async (): Promise<{ data: SolicitudEntrega[] }> => {
    const response = await api.get('/entregas/pendientes');
    return response.data;
  },

  getById: async (id: number | string): Promise<{ data: any }> => {
    const response = await api.get(`/entregas/${id}`);
    return response.data;
  },

  confirmar: async (data: ConfirmarEntregaRequest) => {
    const response = await api.post('/entregas/confirmar', data);
    return response.data;
  },

  cancelar: async (id: number, motivo?: string) => {
    const response = await api.put(`/entregas/${id}/cancelar`, { motivo });
    return response.data;
  },

  marcarNoEntregado: async (id: number, observaciones?: string, foto_evidencia?: string) => {
    const response = await api.patch(`/entregas/${id}/no-entregado`, { observaciones, foto_evidencia });
    return response.data;
  },

  reportarIncidente: async (id: number, observaciones: string) => {
    const response = await api.post(`/entregas/${id}/incidente`, { observaciones });
    return response.data;
  },

  getEstadisticas: async () => {
    const response = await api.get('/entregas/estadisticas');
    return response.data;
  },
};
