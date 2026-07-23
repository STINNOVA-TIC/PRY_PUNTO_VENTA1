import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Permiso } from '../../types/permisos';

interface PermissionGuardProps {
  children: React.ReactNode;
  permiso: Permiso;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permiso,
  fallback = null,
}) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permiso)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
