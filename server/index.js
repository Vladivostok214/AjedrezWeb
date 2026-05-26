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

// Mapa de salas en memoria: roomId (string) -> { players: Set, colorsAssigned: boolean }
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
            room = {
              players: new Set(),
              colorsAssigned: false
            };
            rooms.set(roomId, room);
          }

          // Restringir a un máximo estricto de 2 jugadores (1v1)
          if (room.players.size >= 2) {
            console.log(`Sala ${roomId} llena. Rechazando nuevo cliente.`);
            ws.send(JSON.stringify({ type: 'room-full', payload: { roomId } }));
            ws.close();
            return;
          }

          ws.roomId = roomId;
          room.players.add(ws);

          console.log(`Jugador se unió a la sala ${roomId}. Jugadores activos: ${room.players.size}`);

          // --- CASO A: Es la primera conexión a la sala ---
          if (room.players.size === 1) {
            // Notificamos que está esperando al rival, por defecto Blancas provisionalmente
            ws.send(JSON.stringify({
              type: 'room-status',
              payload: { color: 'white', roomId, opponentPresent: false, waiting: true }
            }));
          } 
          // --- CASO B: Se une el segundo jugador y los colores no han sido asignados ---
          else if (room.players.size === 2 && !room.colorsAssigned) {
            const playersArray = Array.from(room.players);
            
            // Sorteo aleatorio inicial: el primer jugador obtiene color aleatorio, el segundo el opuesto
            const hostColor = Math.random() < 0.5 ? 'white' : 'black';
            const guestColor = hostColor === 'white' ? 'black' : 'white';

            playersArray[0].color = hostColor;
            playersArray[1].color = guestColor;
            room.colorsAssigned = true;

            console.log(`Sorteo de colores realizado en sala ${roomId}. Host: ${hostColor}, Guest: ${guestColor}`);

            // Enviar estados asignados finales a ambos jugadores
            playersArray[0].send(JSON.stringify({
              type: 'room-status',
              payload: { color: hostColor, roomId, opponentPresent: true }
            }));

            playersArray[1].send(JSON.stringify({
              type: 'room-status',
              payload: { color: guestColor, roomId, opponentPresent: true }
            }));

            // Notificar match listo a ambos
            playersArray[0].send(JSON.stringify({ type: 'peer-joined' }));
            playersArray[1].send(JSON.stringify({ type: 'peer-joined' }));
          } 
          // --- CASO C: Se une un jugador tras una reconexión (los colores ya están asignados) ---
          else if (room.players.size === 2 && room.colorsAssigned) {
            const playersArray = Array.from(room.players);
            const otherPlayer = playersArray.find(p => p !== ws);
            
            // Asigna el color opuesto al del jugador que ya estaba en la sala para evitar duplicidad de color
            const assignedColor = otherPlayer.color === 'white' ? 'black' : 'white';
            ws.color = assignedColor;

            console.log(`Jugador reconectado en sala ${roomId}. Asignado color remanente: ${assignedColor}`);

            ws.send(JSON.stringify({
              type: 'room-status',
              payload: { color: assignedColor, roomId, opponentPresent: true }
            }));

            // Notificar la presencia al oponente
            otherPlayer.send(JSON.stringify({ type: 'peer-joined' }));
          }
          break;
        }

        // Ejecutar un nuevo sorteo de colores al reiniciar la partida por mutuo acuerdo
        case 'reset-game': {
          const { roomId } = ws;
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room || room.players.size !== 2) return;

          const playersArray = Array.from(room.players);
          
          // Nuevo sorteo aleatorio
          const hostColor = Math.random() < 0.5 ? 'white' : 'black';
          const guestColor = hostColor === 'white' ? 'black' : 'white';

          playersArray[0].color = hostColor;
          playersArray[1].color = guestColor;
          room.colorsAssigned = true;

          console.log(`Nuevo sorteo de colores por reinicio en sala ${roomId}. Host: ${hostColor}, Guest: ${guestColor}`);

          // Enviar nuevos roles
          playersArray[0].send(JSON.stringify({
            type: 'room-status',
            payload: { color: hostColor, roomId, opponentPresent: true }
          }));

          playersArray[1].send(JSON.stringify({
            type: 'room-status',
            payload: { color: guestColor, roomId, opponentPresent: true }
          }));

          // Notificar el reinicio para resetear el tablero localmente
          for (const client of room.players) {
            client.send(JSON.stringify({ type: 'reset-game' }));
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

        // Reenvío directo (Broker) de jugadas y chat al oponente en la misma sala
        case 'chess-move':
        case 'chat-message':
        case 'peer-left': {
          const { roomId } = ws;
          if (!roomId) return;

          const room = rooms.get(roomId);
          if (!room) return;

          for (const client of room.players) {
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
        room.players.delete(ws);
        
        // Limpieza de la sala si se vacía por completo
        if (room.players.size === 0) {
          rooms.delete(roomId);
          console.log(`Sala ${roomId} vaciada y eliminada de memoria.`);
        } else {
          // Notificar al rival remanente
          for (const client of room.players) {
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
