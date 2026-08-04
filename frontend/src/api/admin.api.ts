import api from './auth.api';

export const adminAPI = {
  read: async (table: string): Promise<{ data: any[] }> => {
    const response = await api.get(`/admin/crud/${table}`);
    return response.data;
  },

  create: async (table: string, data: any) => {
    const response = await api.post(`/admin/crud/${table}`, data);
    return response.data;
  },

  update: async (table: string, id: number, data: any) => {
    const response = await api.put(`/admin/crud/${table}/${id}`, data);
    return response.data;
  },

  toggleStatus: async (table: string, id: number, activo: boolean) => {
    const response = await api.patch(`/admin/crud/${table}/${id}/status`, { activo });
    return response.data;
  },

  delete: async (table: string, id: number) => {
    const response = await api.delete(`/admin/crud/${table}/${id}`);
    return response.data;
  },

  uploadPhoto: async (file: File, type: 'empleado' | 'producto' | 'entrega' | 'firma' | 'firmas'): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('foto', file);
    const response = await api.post(`/upload?type=${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
