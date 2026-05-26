const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;

// Crear un servidor HTTP básico para soportar Health Checks requeridos por plataformas como Render/Railway
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server });

// Mapa de salas en memoria: roomId (string) -> Set (conexiones WebSocket activas)
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('Nueva conexión cliente iniciada en señalización.');
  
  ws.roomId = null;
  ws.color = null;

  ws.on('message', (message) => {
    try {
      const { type, payload } = JSON.parse(message);
      
      switch (type) {
        case 'join': {
          const { roomId } = payload;
          if (!roomId) {
            console.warn('Intento de unión sin roomId provisto.');
            return;
          }

          let room = rooms.get(roomId);
          if (!room) {
            room = new Set();
            rooms.set(roomId, room);
          }

          // Restringir a un máximo estricto de 2 jugadores (1v1)
          if (room.size >= 2) {
            console.log(`Sala ${roomId} llena. Rechazando nuevo cliente.`);
            ws.send(JSON.stringify({ type: 'room-full', payload: { roomId } }));
            ws.close();
            return;
          }

          // Asignación síncrona de colores: Blanco para el creador, Negro para el invitado
          const assignedColor = room.size === 0 ? 'white' : 'black';
          ws.roomId = roomId;
          ws.color = assignedColor;
          room.add(ws);

          console.log(`Jugador se unió a la sala ${roomId} como ${assignedColor}. Tamaño sala: ${room.size}`);

          // Confirmación de ingreso al cliente que se conecta
          ws.send(JSON.stringify({
            type: 'room-status',
            payload: { color: assignedColor, roomId }
          }));

          // Notificar al oponente (si ya estaba en la sala)
          for (const client of room) {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify({ type: 'peer-joined' }));
            }
          }
          break;
        }

        // Responder al Heartbeat del cliente para mantener la conexión viva
        case 'ping': {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;
        }

        // Reenvío directo (Broker) de jugadas, chat y salida al rival en la misma sala
        case 'chess-move':
        case 'chat-message':
        case 'peer-left': {
          const { roomId } = ws;
          if (!roomId) return;

          const room = rooms.get(roomId);
          if (!room) return;

          for (const client of room) {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify({ type, payload }));
            }
          }
          break;
        }

        default:
          console.warn('Tipo de mensaje desconocido recibido:', type);
      }
    } catch (err) {
      console.error('Error procesando mensaje WebSocket:', err);
    }
  });

  ws.on('close', () => {
    const { roomId, color } = ws;
    console.log(`Conexión cerrada para el cliente en sala ${roomId} (${color})`);

    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.delete(ws);
        
        // Limpieza de la sala si está vacía
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`Sala ${roomId} vaciada y eliminada.`);
        } else {
          // Notificar al rival sobreviviente para activar el flujo de reconexión/abandono
          for (const client of room) {
            if (client.readyState === ws.OPEN) {
              client.send(JSON.stringify({ type: 'peer-left' }));
            }
          }
        }
      }
    }
  });

  ws.onerror = (err) => {
    console.error('Error de canal WebSocket:', err);
  };
});

server.listen(PORT, () => {
  console.log(`Servidor de señalización escuchando en el puerto ${PORT}`);
});
