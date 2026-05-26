import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
  // handlersRef almacena todos los handlers registrados — nunca se resetea entre renders
  const handlersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);

  // Extrae el roomId de la ruta de forma robusta (ignorando slashes finales)
  const path = window.location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  const roomId = path.startsWith('/room/') ? pathSegments[pathSegments.length - 1] : null;

  // sendMessage es estable gracias a useCallback — no crea nuevas referencias en cada render
  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('No se puede enviar mensaje WebSocket, la conexión no está abierta:', type);
    }
  }, []);

  // registerHandler es estable gracias a useCallback con deps vacías.
  // CRÍTICO: Esto garantiza que el useEffect en RoomPage.tsx que depende de registerHandler
  // se ejecute UNA SOLA VEZ (al montar), evitando la ventana de tiempo donde los handlers
  // se des-suscriben durante un re-render y mensajes como 'game-resign' o 'rematch-request'
  // se descartan silenciosamente.
  const registerHandler = useCallback((type: string, callback: (payload: any) => void) => {
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
  }, []);

  useEffect(() => {
    if (!roomId || roomId === 'offline-ai') return;

    let reconnectTimeout: number;
    // URL del servidor WebSocket (soportando configuraciones de prod y dev)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const defaultWsUrl = `${wsProtocol}//${window.location.hostname}:3001`;
    
    if (!import.meta.env.VITE_SIGNALING_URL && !isLocalhost) {
      console.error('CRÍTICO: VITE_SIGNALING_URL no está definida. Las conexiones WebSocket fallarán en producción.');
    }

    let wsUrl = import.meta.env.VITE_SIGNALING_URL || defaultWsUrl;
    // Sanitizar la URL para prevenir errores tipográficos (como wsss://, o ingresar http/https por error)
    wsUrl = wsUrl
      .replace(/^https:/i, 'wss:')
      .replace(/^http:/i, 'ws:')
      .replace(/^wsss:/i, 'wss:');

    const connect = () => {
      console.log(`Conectando al servidor de señalización WebSocket en ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;
      setSocket(ws);

      ws.onopen = () => {
        console.log('Señalización WebSocket conectada exitosamente.');
        setConnected(true);
        // El mensaje "join" ahora lo envía el consumidor (RoomPage) 
        // para asegurar que sus handlers estén registrados antes.
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          // Despachar el mensaje a todos los handlers registrados para ese tipo
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

  // Heartbeat para mantener activa la conexión en plataformas PaaS (como Render/Railway)
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      sendMessage('ping', {});
    }, 20000); // Ping cada 20 segundos
    return () => clearInterval(interval);
  }, [connected, sendMessage]);

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
