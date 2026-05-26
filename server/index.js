const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;

// Servidor HTTP para Health Checks (Render/Railway)
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
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('[WS] Nueva conexión iniciada.');
  
  ws.roomId = null;
  ws.color = null;

  ws.on('message', (data) => {
    try {
      const message = data.toString();
      const { type, payload } = JSON.parse(message);
      
      console.log(`[WS] Mensaje: ${type} | Sala: ${ws.roomId || payload?.roomId || 'N/A'}`);

      switch (type) {
        case 'join': {
          const { roomId } = payload;
          if (!roomId) return;

          let room = rooms.get(roomId);
          if (!room) {
            room = { players: new Set(), colorsAssigned: false, gameOver: false };
            rooms.set(roomId, room);
            console.log(`[ROOM] Sala creada: ${roomId}`);
          }

          if (room.players.size >= 2) {
            ws.send(JSON.stringify({ type: 'room-full', payload: { roomId } }));
            ws.close();
            return;
          }

          ws.roomId = roomId;
          room.players.add(ws);

          if (room.players.size === 1) {
            ws.color = 'white';
            ws.send(JSON.stringify({
              type: 'room-status',
              payload: { color: 'white', roomId, opponentPresent: false, waiting: true, playerCount: 1 }
            }));
          } else {
            const playersArray = Array.from(room.players);
            const hostColor = Math.random() < 0.5 ? 'white' : 'black';
            const guestColor = hostColor === 'white' ? 'black' : 'white';

            playersArray[0].color = hostColor;
            playersArray[1].color = guestColor;
            room.colorsAssigned = true;

            playersArray[0].send(JSON.stringify({
              type: 'room-status', payload: { color: hostColor, roomId, opponentPresent: true, playerCount: 2 }
            }));
            playersArray[1].send(JSON.stringify({
              type: 'room-status', payload: { color: guestColor, roomId, opponentPresent: true, playerCount: 2 }
            }));

            playersArray[0].send(JSON.stringify({ type: 'peer-joined' }));
            playersArray[1].send(JSON.stringify({ type: 'peer-joined' }));
          }
          break;
        }

        case 'game-resign': {
          const { roomId, color } = ws;
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room) return;

          room.gameOver = true;
          console.log(`[ROOM] ${roomId}: Rendición de ${color}. Notificando al rival...`);

          room.players.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game-resign', payload: { resignedColor: color } }));
              console.log(`[ROOM] ${roomId}: Mensaje de victoria enviado a ${client.color}`);
            }
          });
          break;
        }

        case 'reset-game': {
          const { roomId } = ws;
          const room = rooms.get(roomId);
          if (!room || room.players.size !== 2) return;

          const playersArray = Array.from(room.players);
          const hostColor = Math.random() < 0.5 ? 'white' : 'black';
          const guestColor = hostColor === 'white' ? 'black' : 'white';

          playersArray[0].color = hostColor;
          playersArray[1].color = guestColor;
          room.gameOver = false;

          console.log(`[ROOM] ${roomId}: Nueva partida. Colores sorteados.`);

          playersArray[0].send(JSON.stringify({
            type: 'room-status', payload: { color: hostColor, roomId, opponentPresent: true, playerCount: 2 }
          }));
          playersArray[1].send(JSON.stringify({
            type: 'room-status', payload: { color: guestColor, roomId, opponentPresent: true, playerCount: 2 }
          }));

          room.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'reset-game' }));
            }
          });
          break;
        }

        case 'ping': {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default: {
          const { roomId, color } = ws;
          const room = rooms.get(roomId);
          if (!room) {
            console.warn(`[WS] Intento de broadcast (${type}) en sala no válida: ${roomId}`);
            return;
          }
          
          console.log(`[WS] Reenviando ${type} de ${color} al rival en sala ${roomId}`);

          room.players.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type, payload }));
            }
          });
          break;
        }
      }
    } catch (err) {
      console.error('[ERR] WS Message:', err);
    }
  });

  ws.on('close', () => {
    const { roomId, color } = ws;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players.delete(ws);
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
          for (const client of room.players) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'peer-left', payload: { wasGameOver: room.gameOver, resignedColor: color } }));
            }
          }
        }
      }
    }
  });
});

server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
