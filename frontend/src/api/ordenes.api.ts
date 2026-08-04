import api from './auth.api';

export const ordenesAPI = {
  crear: async (data: any) => {
    const response = await api.post('/ordenes-compra', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/ordenes-compra');
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await api.get(`/ordenes-compra/${id}`);
    return response.data;
  },

  getSiguienteSecuencial: async (departamento_id: number, empresa_id: number) => {
    const response = await api.get(`/ordenes-compra/secuencial/siguiente?departamento_id=${departamento_id}&empresa_id=${empresa_id}`);
    return response.data;
  },

  entregar: async (id: number | string, facturas: string[]) => {
    const response = await api.put(`/ordenes-compra/${id}/entregar`, { facturas });
    return response.data;
  },

  eliminar: async (id: number | string) => {
    const response = await api.delete(`/ordenes-compra/${id}`);
    return response.data;
  },

  firmar: async (id: number | string) => {
    const response = await api.put(`/ordenes-compra/${id}/firmar`);
    return response.data;
  }
};
