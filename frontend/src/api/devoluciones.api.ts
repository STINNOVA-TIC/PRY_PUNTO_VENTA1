import api from './auth.api';

export const devolucionesAPI = {
  solicitar: async (solicitud_entrega_id: number, motivo: string, detalles?: { producto_id: number; cantidad_devuelta: number }[]) => {
    const response = await api.post('/devoluciones', { solicitud_entrega_id, motivo, detalles });
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/devoluciones');
    return response.data;
  },

  aprobar: async (id: number) => {
    const response = await api.patch(`/devoluciones/${id}/aprobar`);
    return response.data;
  },

  rechazar: async (id: number, observaciones: string) => {
    const response = await api.patch(`/devoluciones/${id}/rechazar`, { observaciones });
    return response.data;
  }
};
