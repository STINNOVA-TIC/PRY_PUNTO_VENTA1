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
  },

  getRolePermissions: async (rolId: number): Promise<{ data: any[] }> => {
    const response = await api.get(`/admin/crud/roles/${rolId}/permisos`);
    return response.data;
  },

  saveRolePermissions: async (rolId: number, permisoIds: number[]) => {
    const response = await api.post(`/admin/crud/roles/${rolId}/permisos`, { permiso_ids: permisoIds });
    return response.data;
  },

  getDatabaseStats: async (): Promise<{ data: any }> => {
    const response = await api.get('/admin/crud/database/stats');
    return response.data;
  },

  downloadDatabaseBackup: async (): Promise<void> => {
    const response = await api.get('/admin/crud/database/backup', {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/sql' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `backup_pointofsale_${timestamp}.sql`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  listDatabaseBackups: async (): Promise<{ data: Array<{ filename: string; size: string; size_bytes: number; created_at: string; tipo: string }> }> => {
    const response = await api.get('/admin/crud/database/backups');
    return response.data;
  },

  createDatabaseBackup: async (): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.post('/admin/crud/database/backups');
    return response.data;
  },

  downloadBackupFile: async (filename: string): Promise<void> => {
    const response = await api.get(`/admin/crud/database/backups/${encodeURIComponent(filename)}`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  deleteDatabaseBackup: async (filename: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/crud/database/backups/${encodeURIComponent(filename)}`);
    return response.data;
  }
};
