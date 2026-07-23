// frontend/src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectSocket = () => {
    try {
      const socketUrl = window.location.origin;

      const newSocket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      newSocket.on('connect', () => {
        console.log('🔌 Socket conectado');
        setConnected(true);
        setError(null);
      });

      newSocket.on('connect_error', (err) => {
        console.error('❌ Error de conexión Socket:', err.message);
        setError(err.message);
        setConnected(false);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket desconectado:', reason);
        setConnected(false);
        if (reason === 'io server disconnect') {
          newSocket.connect();
        }
      });

      newSocket.on('pong', (data) => {
        console.log('🏓 Pong recibido:', data);
      });

      setSocket(newSocket);

      return newSocket;
    } catch (error) {
      console.error('❌ Error al crear socket:', error);
      setError('Error al conectar con el servidor');
      return null;
    }
  };

  useEffect(() => {
    const newSocket = connectSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const reconnect = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    } else {
      connectSocket();
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, error, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
