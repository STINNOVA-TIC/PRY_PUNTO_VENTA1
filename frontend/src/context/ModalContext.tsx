import React, { createContext, useContext, useState, useRef } from 'react';

interface ModalOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isAlert?: boolean; // Si es true, solo muestra botón de Aceptar (estilo alert)
}

interface ModalContextType {
  showConfirm: (options: Omit<ModalOptions, 'isAlert'>) => Promise<boolean>;
  showAlert: (options: Omit<ModalOptions, 'isAlert' | 'cancelLabel'>) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal debe ser usado dentro de un ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModalOptions>({ title: '', message: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = (opts: Omit<ModalOptions, 'isAlert'>): Promise<boolean> => {
    setOptions({ ...opts, isAlert: false });
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const showAlert = (opts: Omit<ModalOptions, 'isAlert' | 'cancelLabel'>): Promise<void> => {
    setOptions({ ...opts, isAlert: true });
    setIsOpen(true);
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  // Determinar colores y estilos según el tipo
  const getTypeStyles = () => {
    switch (options.type) {
      case 'danger':
        return {
          icon: (
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          bgIcon: 'bg-red-50',
          btnConfirm: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          icon: (
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          bgIcon: 'bg-amber-50',
          btnConfirm: 'bg-amber-500 hover:bg-amber-600 text-white'
        };
      case 'success':
        return {
          icon: (
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgIcon: 'bg-emerald-50',
          btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      default: // info o por defecto
        return {
          icon: (
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgIcon: 'bg-blue-50',
          btnConfirm: 'bg-gray-800 hover:bg-gray-700 text-white'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop con blur */}
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={options.isAlert ? handleConfirm : handleCancel}></div>

            {/* Modal Box */}
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-gray-150 animate-fade-in">
              <div className="bg-white px-6 pt-6 pb-5">
                <div className="sm:flex sm:items-start">
                  {/* Icono de tipo */}
                  <div className={`mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.bgIcon} sm:mx-0 sm:h-10 sm:w-10`}>
                    {styles.icon}
                  </div>
                  
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {options.title}
                    </h3>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {options.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 ${styles.btnConfirm}`}
                >
                  {options.confirmLabel || 'Aceptar'}
                </button>
                {!options.isAlert && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition active:scale-95"
                  >
                    {options.cancelLabel || 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
