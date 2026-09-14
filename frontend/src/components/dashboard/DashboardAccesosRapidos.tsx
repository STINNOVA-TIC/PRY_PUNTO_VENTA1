import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BsArrowRight } from 'react-icons/bs';
import { AccesoRapidoItem } from './types';

interface DashboardAccesosRapidosProps {
  accesos: AccesoRapidoItem[];
}

export const DashboardAccesosRapidos: React.FC<DashboardAccesosRapidosProps> = ({ accesos }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3.5">
      <div>
        <h2 className="text-base font-bold text-gray-800">Módulos & Accesos Rápidos</h2>
        <p className="text-xs text-gray-400">Atajos a tus áreas de trabajo principales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accesos.map((acc, idx) => (
          <div
            key={idx}
            onClick={() => navigate(acc.ruta)}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl group-hover:bg-gray-100 transition">
                {acc.icono}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800 group-hover:text-gray-950 transition">
                    {acc.titulo}
                  </h3>
                  {acc.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {acc.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{acc.descripcion}</p>
              </div>
            </div>
            <span className="text-gray-300 group-hover:text-gray-600 transition pl-2">
              <BsArrowRight />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
