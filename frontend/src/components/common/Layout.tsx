import React from 'react';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isShopSession } = useAuth();
  const hideNavbar = isShopSession;

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNavbar && <Navbar />}
      <main className={`container mx-auto px-4 ${hideNavbar ? 'py-6' : 'py-8'}`}>
        {children}
      </main>
    </div>
  );
};
