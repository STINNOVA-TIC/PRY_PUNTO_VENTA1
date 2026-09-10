import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BsCartCheck, BsClipboardCheck, BsFileEarmarkText } from 'react-icons/bs';
import { useAuth } from '../../context/AuthContext';

export const ComprasLayout: React.FC = () => {
  const { hasPermission } = useAuth();
  const canReceive = hasPermission('compras.requerimientos.recibir');

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
      isActive
        ? 'bg-gray-800 text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <section className="space-y-6 font-sans">
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-white">
              <BsCartCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Área corporativa</p>
              <h1 className="text-xl font-bold text-gray-800">Compras</h1>
              <p className="mt-0.5 text-xs text-gray-500">
                Requerimientos de bienes y servicios para todas las áreas de la empresa
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Módulos de Compras">
            <NavLink to="/compras/requerimientos" className={linkClass}>
              <BsFileEarmarkText className="h-4 w-4" />
              Requerimientos
            </NavLink>
            {canReceive && (
              <NavLink to="/compras/recepcion" className={linkClass}>
                <BsClipboardCheck className="h-4 w-4" />
                Recepción
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <Outlet />
    </section>
  );
};
