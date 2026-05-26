const { WebSocketServer, WebSocket } = require('ws');
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

// Mapa de salas en memoria
// Estructura: roomId -> { players: Set<ws>, colorsAssigned: boolean, gameOver: boolean }
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
              colorsAssigned: false,
              gameOver: false
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
            ws.send(JSON.stringify({
              type: 'room-status',
              payload: { color: 'white', roomId, opponentPresent: false, waiting: true }
            }));
          } 
          // --- CASO B: Se une el segundo jugador y los colores no han sido asignados ---
          else if (room.players.size === 2 && !room.colorsAssigned) {
            const playersArray = Array.from(room.players);
            
            const hostColor = Math.random() < 0.5 ? 'white' : 'black';
            const guestColor = hostColor === 'white' ? 'black' : 'white';

            playersArray[0].color = hostColor;
            playersArray[1].color = guestColor;
            room.colorsAssigned = true;

            console.log(`Sorteo de colores realizado en sala ${roomId}. Host: ${hostColor}, Guest: ${guestColor}`);

            playersArray[0].send(JSON.stringify({
              type: 'room-status',
              payload: { color: hostColor, roomId, opponentPresent: true }
            }));

            playersArray[1].send(JSON.stringify({
              type: 'room-status',
              payload: { color: guestColor, roomId, opponentPresent: true }
            }));

            playersArray[0].send(JSON.stringify({ type: 'peer-joined' }));
            playersArray[1].send(JSON.stringify({ type: 'peer-joined' }));
          } 
          // --- CASO C: Reconexión (colores ya asignados) ---
          else if (room.players.size === 2 && room.colorsAssigned) {
            const playersArray = Array.from(room.players);
            const otherPlayer = playersArray.find(p => p !== ws);
            
            const assignedColor = otherPlayer.color === 'white' ? 'black' : 'white';
            ws.color = assignedColor;

            console.log(`Jugador reconectado en sala ${roomId}. Color asignado: ${assignedColor}. Estado partida: ${room.gameOver ? 'terminada' : 'en curso'}`);

            // Informar al jugador que se reconecta su color y el estado actual
            ws.send(JSON.stringify({
              type: 'room-status',
              payload: { 
                color: assignedColor, 
                roomId, 
                opponentPresent: true,
                // Si la partida terminó, indicarlo para que el cliente sepa que es una revancha pendiente
                gameOver: room.gameOver
              }
            }));

            // Notificar al oponente que el rival reconectó
            otherPlayer.send(JSON.stringify({ type: 'peer-joined' }));
          }
          break;
        }

        // Rendición formal de un jugador
        case 'game-resign': {
          const { roomId } = ws;
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room) return;

          // Marcar la sala como partida terminada para no confundir la próxima desconexión con abandono
          room.gameOver = true;
          console.log(`Jugador (${ws.color}) se rindió en sala ${roomId}. Sala abierta para revancha.`);

          // Reenviar la rendición al oponente directamente
          for (const client of room.players) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game-resign', payload: { resignedColor: ws.color } }));
            }
          }
          break;
        }

        // Reinicio de partida por mutuo acuerdo (revancha aceptada)
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
          room.gameOver = false;

          console.log(`Nueva partida en sala ${roomId}. Nuevo sorteo: Host=${hostColor}, Guest=${guestColor}`);

          playersArray[0].send(JSON.stringify({
            type: 'room-status',
            payload: { color: hostColor, roomId, opponentPresent: true }
          }));

          playersArray[1].send(JSON.stringify({
            type: 'room-status',
            payload: { color: guestColor, roomId, opponentPresent: true }
          }));

          for (const client of room.players) {
            client.send(JSON.stringify({ type: 'reset-game' }));
          }
          break;
        }

        // Heartbeat
        case 'ping': {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;
        }

        // Broker genérico: reenvía cualquier otro mensaje al oponente en la misma sala
        // (chat-message, rematch-request, rematch-decline, offer-draw, chess-move, etc.)
        default: {
          const { roomId } = ws;
          if (!roomId) return;

          const room = rooms.get(roomId);
          if (!room) return;

          for (const client of room.players) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type, payload }));
            }
          }
          break;
        }
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
        
        if (room.players.size === 0) {
          rooms.delete(roomId);
          console.log(`Sala ${roomId} vaciada y eliminada de memoria.`);
        } else {
          // Siempre notificar al oponente que el rival cerró su conexión.
          // El CLIENTE es responsable de distinguir si esto fue por rendición (gameOver ya true)
          // o por desconexión real, usando su propio estado local.
          for (const client of room.players) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: 'peer-left',
                payload: { wasGameOver: room.gameOver, resignedColor: color }
              }));
            }
          }
          console.log(`Sala ${roomId}: notificado peer-left (wasGameOver: ${room.gameOver})`);
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
