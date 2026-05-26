import React, { useEffect, useState } from 'react';
import { BoardWrapper } from '../components/Game/BoardWrapper';
import { GameStatus } from '../components/Game/GameStatus';
import { GameControls } from '../components/Game/GameControls';
import { ChatPanel, type ChatMessage } from '../components/Game/ChatPanel';
import { useChessGame } from '../hooks/useChessGame';
import { useSocket } from '../context/SocketContext';

export const RoomPage: React.FC = () => {
  const roomId = window.location.pathname.split('/').pop() || '';
  const isAiMode = roomId === 'offline-ai';
  
  // Hook de ajedrez local
  const chess = useChessGame();
  
  // Socket de transporte
  const { registerHandler, sendMessage, connected: socketConnected } = useSocket();

  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [opponentPresent, setOpponentPresent] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Configurar modo de IA si la sala es offline-ai
  useEffect(() => {
    if (isAiMode) {
      chess.setIsAiMode(true);
      // Inicializar chat con mensaje de sistema para modo offline
      setChatMessages([
        {
          sender: 'sistema',
          text: 'Modo Offline: Estás jugando contra el Procesador CPU. El chat y la red están inactivos.',
          time: ''
        }
      ]);
    }
  }, [isAiMode]);

  // Escuchar eventos de la red mediante WebSockets (Solo modo online)
  useEffect(() => {
    if (isAiMode) return;

    // Estado inicial de la sala al unirse (incluyendo color y presencia)
    const unsubStatus = registerHandler('room-status', (payload: { color: 'white' | 'black', opponentPresent?: boolean, waiting?: boolean }) => {
      console.log('Asignado color de jugador:', payload.color);
      setPlayerColor(payload.color);
      chess.setBoardOrientation(payload.color);
      
      if (payload.waiting) {
        setOpponentPresent(false);
      } else if (payload.opponentPresent) {
        setOpponentPresent(true);
      }
    });

    // Oponente se unió a la sala
    const unsubJoined = registerHandler('peer-joined', () => {
      console.log('Oponente conectado.');
      setOpponentPresent(true);
      setChatMessages(prev => [...prev, {
        sender: 'sistema',
        text: 'El rival se ha conectado. La partida está lista.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    // Oponente abandonó la sala o se desconectó
    const unsubLeft = registerHandler('peer-left', (payload?: { reason?: string }) => {
      console.log('Oponente desconectado.');
      setOpponentPresent(false);
      
      const isResign = payload?.reason === 'resign';
      setChatMessages(prev => [...prev, {
        sender: 'sistema',
        text: isResign ? 'El oponente se ha rendido.' : 'El oponente se desconectó de la sala.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      if (isResign) {
        chess.forceResign(playerColor);
      } else {
        chess.forceResign(playerColor);
      }
    });

    // Recibir movimiento de ajedrez del rival (incluye su tiempo de reloj restante)
    const unsubChessMove = registerHandler('chess-move', (payload: { from: string, to: string, promotion?: string, timeLeft?: number }) => {
      console.log('Movimiento recibido del rival:', payload);
      chess.opponentMove(payload, payload.timeLeft);
    });

    // Recibir mensaje de chat del oponente
    const unsubChatMsg = registerHandler('chat-message', (payload: { text: string }) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, {
        sender: 'rival',
        text: payload.text,
        time
      }]);
    });

    // Recibir evento de reinicio de partida por mutuo acuerdo
    const unsubReset = registerHandler('reset-game', () => {
      console.log('Partida reiniciada.');
      chess.resetGame();
      setChatMessages(prev => [...prev, {
        sender: 'sistema',
        text: 'La partida ha sido reiniciada. Se han sorteado nuevos colores.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    return () => {
      unsubStatus();
      unsubJoined();
      unsubLeft();
      unsubChessMove();
      unsubChatMsg();
      unsubReset();
    };
  }, [isAiMode, registerHandler, playerColor, chess]);

  // Manejar el movimiento local de piezas y enviarlo por la red
  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    // Evitar movimientos si la partida terminó o si no es el turno correspondiente
    if (chess.isGameOver) return false;

    const isMyTurn = (chess.turn === 'w' && playerColor === 'white') || 
                      (chess.turn === 'b' && playerColor === 'black');
    
    if (!isMyTurn) {
      console.warn('Mover en el turno del rival no está permitido.');
      return false;
    }

    const success = chess.makeMove(sourceSquare, targetSquare, piece);
    if (success && !isAiMode) {
      const isPawn = piece.toLowerCase().endsWith('p');
      const isPromotionSquare = targetSquare.endsWith('8') || targetSquare.endsWith('1');
      const promotion = (isPawn && isPromotionSquare) ? 'q' : undefined;

      // Obtener nuestro tiempo restante del reloj local para sincronizar
      const myColorKey = playerColor === 'white' ? 'w' : 'b';
      const timeLeft = chess.clocks[myColorKey];

      // Enviar jugada y tiempo a través del WebSocket
      sendMessage('chess-move', {
        from: sourceSquare,
        to: targetSquare,
        promotion,
        timeLeft
      });
    }
    return success;
  };

  // Enviar mensaje de chat local
  const handleSendChatMessage = (text: string) => {
    if (isAiMode) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, {
      sender: 'tú',
      text,
      time
    }]);

    sendMessage('chat-message', { text });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-7xl mx-auto w-full">
      {/* Cabecera de la Partida */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-accent-violet to-accent-cyan bg-clip-text text-transparent uppercase font-display">
              Ajedrez 1v1 P2P
            </span>
            <span className="text-[10px] text-gray-500 font-mono select-all bg-black/40 px-3 py-1 rounded-full border border-white/5">
              {isAiMode ? 'MODO ENTRENAMIENTO' : `SALA: ${roomId}`}
            </span>
          </div>
          {!isAiMode && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[10px] text-gray-400">
                {socketConnected ? 'Servidor Conectado' : 'Reconectando al Servidor...'}
              </span>
              <span className="text-gray-600 text-[10px]">•</span>
              <span className="text-[10px] text-gray-400">
                {opponentPresent ? 'Rival en línea' : 'Esperando rival...'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-neutral-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            Juegas con: <strong className="text-white uppercase">{playerColor === 'white' ? 'Blancas' : 'Negras'}</strong>
          </span>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 border bg-neutral-900/60 hover:bg-neutral-800 border-white/5 text-gray-300 hover:border-white/15 active:scale-95 cursor-pointer"
          >
            🏠 Volver al Inicio
          </button>
          {!isAiMode && (
            <button 
              onClick={handleCopyLink}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 border ${
                copyFeedback 
                  ? 'bg-green-600/20 border-green-500/30 text-green-400' 
                  : 'bg-accent-violet/10 hover:bg-accent-violet/20 border-accent-violet/20 text-accent-violet'
              }`}
            >
              {copyFeedback ? '✓ Copiado!' : '🔗 Copiar Invitación'}
            </button>
          )}
        </div>
      </header>

      {/* Grid Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Columna Izquierda: Tablero de Ajedrez */}
        <div className="lg:col-span-2 flex items-center justify-center p-4 glass-panel rounded-2xl">
          <BoardWrapper 
            fen={chess.fen}
            orientation={chess.boardOrientation}
            onPieceDrop={handlePieceDrop}
          />
        </div>

        {/* Columna Derecha: Clocks, Movimientos, Chat y Botones */}
        <div className="flex flex-col gap-4">
          
          {/* Relojes y Notación SAN */}
          <GameStatus 
            turn={chess.turn}
            isGameOver={chess.isGameOver}
            gameOverReason={chess.gameOverReason}
            clocks={chess.clocks}
            playerColor={playerColor}
            history={chess.history}
            capturedPieces={chess.capturedPieces}
            isAiMode={isAiMode}
          />

          {/* Panel del Chat */}
          <ChatPanel 
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            disabled={isAiMode}
          />
          
          {/* Acciones e Interrupciones del juego */}
          <GameControls 
            onResign={() => {
              const winnerColor = playerColor === 'white' ? 'black' : 'white';
              chess.forceResign(winnerColor);
              if (!isAiMode) {
                sendMessage('peer-left', { reason: 'resign' });
              }
            }}
            onOfferDraw={() => {
              if (isAiMode) {
                alert('La computadora ha declinado la oferta de tablas.');
              } else {
                sendMessage('chat-message', { text: '🚩 Ofrezco tablas en la partida.' });
                alert('Solicitud de tablas enviada por el chat.');
              }
            }}
            onReset={chess.resetGame}
            canReset={chess.isGameOver}
          />
          
        </div>

      </div>
    </div>
  );
};
