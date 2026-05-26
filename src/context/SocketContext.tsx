import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface SocketContextType {
  socket: WebSocket | null;
  connected: boolean;
  sendMessage: (type: string, payload: any) => void;
  registerHandler: (type: string, callback: (payload: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const handlersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);

  // Extrae el roomId de la ruta si está presente
  const path = window.location.pathname;
  const roomId = path.startsWith('/room/') ? path.split('/').pop() : null;

  const sendMessage = (type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('No se puede enviar mensaje WebSocket, la conexión no está abierta:', type);
    }
  };

  const registerHandler = (type: string, callback: (payload: any) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(callback);

    // Retorna una función para desuscribirse limpiamente
    return () => {
      const typeHandlers = handlersRef.current.get(type);
      if (typeHandlers) {
        typeHandlers.delete(callback);
        if (typeHandlers.size === 0) {
          handlersRef.current.delete(type);
        }
      }
    };
  };

  useEffect(() => {
    if (!roomId || roomId === 'offline-ai') return;

    let reconnectTimeout: number;
    // URL del servidor WebSocket (soportando configuraciones de prod y dev)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${wsProtocol}//${window.location.hostname}:3001`;
    const wsUrl = import.meta.env.VITE_SIGNALING_URL || defaultWsUrl;

    const connect = () => {
      console.log(`Conectando al servidor de señalización WebSocket en ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;
      setSocket(ws);

      ws.onopen = () => {
        console.log('Señalización WebSocket conectada exitosamente.');
        setConnected(true);
        // Enviamos evento "join" inmediatamente
        ws.send(JSON.stringify({ type: 'join', payload: { roomId } }));
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          const typeHandlers = handlersRef.current.get(type);
          if (typeHandlers) {
            typeHandlers.forEach((cb) => cb(payload));
          }
        } catch (err) {
          console.error('Error parseando mensaje entrante de WebSocket:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket cerrado, programando reconexión en 3s...');
        setConnected(false);
        setSocket(null);
        socketRef.current = null;
        reconnectTimeout = window.setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('Error de conexión en WebSocket:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // Evitar reconexión al desmontar
        socketRef.current.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [roomId]);

  return (
    <SocketContext.Provider value={{ socket, connected, sendMessage, registerHandler }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider');
  }
  return context;
};
