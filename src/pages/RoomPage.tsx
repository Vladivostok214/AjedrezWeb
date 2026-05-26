import React, { useEffect, useState, useRef } from 'react';
import { BoardWrapper } from '../components/Game/BoardWrapper';
import { GameStatus } from '../components/Game/GameStatus';
import { GameControls } from '../components/Game/GameControls';
import { ChatPanel, type ChatMessage } from '../components/Game/ChatPanel';
import { useChessGame } from '../hooks/useChessGame';
import { useSocket } from '../context/SocketContext';
import { formatTime } from '../utils';

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

  // Drawers responsivos
  const [leftDrawerOpen, setLeftDrawerOpen] = useState<boolean>(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(false);

  // Estados de revancha
  const [waitingForRematchApproval, setWaitingForRematchApproval] = useState<boolean>(false);
  const [hasRematchRequest, setHasRematchRequest] = useState<boolean>(false);

  // Estados de sorteo de color animado
  const [drawStatus, setDrawStatus] = useState<'idle' | 'shuffling' | 'assigned'>('idle');
  const [tempColor, setTempColor] = useState<'white' | 'black'>('white');
  const [drawnColor, setDrawnColor] = useState<'white' | 'black' | null>(null);

  // Referencia al color asignado más reciente para usar en el sorteo tras un reset
  const latestColorRef = useRef<'white' | 'black'>('white');

  // Desplazamiento al inicio (Scroll to Top) al cargar la sala
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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

  // Función animadora del sorteo de colores
  const triggerColorDraw = (finalColor: 'white' | 'black') => {
    setDrawStatus('shuffling');
    setDrawnColor(finalColor);
    
    let count = 0;
    const interval = setInterval(() => {
      setTempColor(prev => prev === 'white' ? 'black' : 'white');
      count++;
      if (count >= 15) {
        clearInterval(interval);
        setDrawStatus('assigned');
        setTimeout(() => {
          setDrawStatus('idle');
        }, 2000);
      }
    }, 100);
  };

  // Escuchar eventos de la red mediante WebSockets (Solo modo online)
  useEffect(() => {
    if (isAiMode) return;

    // Estado inicial de la sala al unirse (incluyendo color y presencia)
    const unsubStatus = registerHandler('room-status', (payload: { color: 'white' | 'black', opponentPresent?: boolean, waiting?: boolean }) => {
      console.log('Asignado color de jugador:', payload.color);
      latestColorRef.current = payload.color;
      setPlayerColor(payload.color);
      chess.setBoardOrientation(payload.color);
      
      if (payload.waiting) {
        setOpponentPresent(false);
      } else if (payload.opponentPresent) {
        setOpponentPresent(true);
        // Si el oponente se conecta y el juego no ha empezado, barajar colores
        if (chess.history.length === 0) {
          triggerColorDraw(payload.color);
        }
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

      chess.forceResign(playerColor);
    });

    // Recibir movimiento de ajedrez del rival
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

    // Recibir reinicio de partida por mutuo acuerdo
    const unsubReset = registerHandler('reset-game', () => {
      console.log('Partida reiniciada por el servidor.');
      setWaitingForRematchApproval(false);
      setHasRematchRequest(false);
      chess.resetGame();
      setChatMessages(prev => [...prev, {
        sender: 'sistema',
        text: 'La partida ha sido reiniciada. Se han sorteado nuevos colores.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      // Disparar animación de sorteo con el último color recibido
      triggerColorDraw(latestColorRef.current);
    });

    // Recibir solicitud de revancha
    const unsubRematchRequest = registerHandler('rematch-request', () => {
      console.log('El oponente ha solicitado una revancha.');
      setHasRematchRequest(true);
    });

    // Recibir rechazo de revancha
    const unsubRematchDecline = registerHandler('rematch-decline', () => {
      console.log('El oponente ha rechazado la revancha.');
      setWaitingForRematchApproval(false);
      setChatMessages(prev => [...prev, {
        sender: 'sistema',
        text: 'El rival ha rechazado la solicitud de revancha.',
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
      unsubRematchRequest();
      unsubRematchDecline();
    };
  }, [isAiMode, registerHandler, playerColor, chess]);

  // Manejar el movimiento local de piezas y enviarlo por la red
  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
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

      const myColorKey = playerColor === 'white' ? 'w' : 'b';
      const timeLeft = chess.clocks[myColorKey];

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

  // Enviar solicitud de revancha
  const handleRequestRematch = () => {
    if (isAiMode) {
      chess.resetGame();
      triggerColorDraw('white');
      return;
    }

    sendMessage('rematch-request', {});
    setWaitingForRematchApproval(true);
    setChatMessages(prev => [...prev, {
      sender: 'sistema',
      text: 'Solicitud de revancha enviada. Esperando aceptación...',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Aceptar la revancha
  const handleAcceptRematch = () => {
    setHasRematchRequest(false);
    sendMessage('reset-game', {});
  };

  // Rechazar la revancha
  const handleDeclineRematch = () => {
    setHasRematchRequest(false);
    sendMessage('rematch-decline', {});
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const getCapturedPiecesForColor = (color: 'white' | 'black') => {
    return color === 'white' ? chess.capturedPieces.b : chess.capturedPieces.w;
  };

  const renderMobileOpponentBar = () => {
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const opponentColorKey = opponentColor === 'white' ? 'w' : 'b';
    const isOpponentActive = chess.turn === opponentColorKey && !chess.isGameOver && chess.history.length > 0;
    
    return (
      <div className={`flex justify-between items-center px-4 py-2 rounded-xl border transition-all duration-300 ${
        isOpponentActive 
          ? 'border-accent-cyan/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-accent-cyan/5' 
          : 'border-white/5 bg-black/20'
      } lg:hidden mb-3 w-full max-w-[500px]`}>
        <div className="flex flex-col">
          <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">
            {isAiMode ? 'CPU (Negras)' : 'Rival'}
          </span>
          <div className="text-[9px] text-gray-400 min-h-[12px] mt-0.5">
            {Object.entries(getCapturedPiecesForColor(opponentColor)).map(([piece, count]) => (
              count > 0 ? <span key={piece} className="inline-block mr-1 bg-white/5 px-1 rounded">{piece.toUpperCase()}×{count}</span> : null
            ))}
          </div>
        </div>
        <div className="text-lg font-bold font-mono tracking-tight text-white">
          {formatTime(chess.clocks[opponentColorKey])}
        </div>
      </div>
    );
  };

  const renderMobilePlayerBar = () => {
    const myColorKey = playerColor === 'white' ? 'w' : 'b';
    const isPlayerActive = chess.turn === myColorKey && !chess.isGameOver && chess.history.length > 0;
    
    return (
      <div className={`flex justify-between items-center px-4 py-2 rounded-xl border transition-all duration-300 ${
        isPlayerActive 
          ? 'border-accent-violet/40 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-accent-violet/5' 
          : 'border-white/5 bg-black/20'
      } lg:hidden mt-3 w-full max-w-[500px]`}>
        <div className="flex flex-col">
          <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">
            Tú ({playerColor === 'white' ? 'Blancas' : 'Negras'})
          </span>
          <div className="text-[9px] text-gray-400 min-h-[12px] mt-0.5">
            {Object.entries(getCapturedPiecesForColor(playerColor)).map(([piece, count]) => (
              count > 0 ? <span key={piece} className="inline-block mr-1 bg-white/5 px-1 rounded">{piece.toUpperCase()}×{count}</span> : null
            ))}
          </div>
        </div>
        <div className="text-lg font-bold font-mono tracking-tight text-white">
          {formatTime(chess.clocks[myColorKey])}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-7xl mx-auto w-full">
      {/* Cabecera de la Partida */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-accent-violet to-accent-cyan bg-clip-text text-transparent uppercase font-display">
              Ajedrez 1v1
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

      {/* Grid Principal (3 Columnas en PC, 1 en Móvil) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full min-h-[480px]">
        
        {/* Columna Izquierda: Relojes, historial, capturas (Solo Desktop) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col justify-between">
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
        </div>

        {/* Columna Central: Tablero de Ajedrez */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 glass-panel rounded-2xl">
          {renderMobileOpponentBar()}
          
          <div className="w-full max-w-[500px]">
            <BoardWrapper 
              fen={chess.fen}
              orientation={chess.boardOrientation}
              onPieceDrop={handlePieceDrop}
            />
          </div>

          {renderMobilePlayerBar()}

          {/* Botones móviles para abrir cajones laterales */}
          <div className="grid grid-cols-2 gap-3 mt-4 lg:hidden w-full max-w-[500px]">
            <button 
              onClick={() => setLeftDrawerOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-gray-300 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer text-xs"
            >
              📋 Historial
            </button>
            <button 
              onClick={() => setRightDrawerOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-gray-300 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer text-xs"
            >
              💬 Chat y Acciones
            </button>
          </div>
        </div>

        {/* Columna Derecha: Chat y Controles (Solo Desktop) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4 h-full">
          <div className="flex-1 min-h-[300px]">
            <ChatPanel 
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              disabled={isAiMode}
            />
          </div>
          
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
            onReset={handleRequestRematch}
            canReset={chess.isGameOver}
          />
        </div>

      </div>

      {/* --- DRAWERS LATERALES (MÓVIL) --- */}

      {/* Drawer Izquierdo - Historial */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[280px] sm:w-[320px] bg-neutral-950/95 border-r border-white/10 p-6 flex flex-col transition-transform duration-300 transform ${
        leftDrawerOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:hidden backdrop-blur-md`}>
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
          <span className="text-sm font-bold text-white uppercase tracking-wider font-display">Historial de Jugadas</span>
          <button 
            onClick={() => setLeftDrawerOpen(false)} 
            className="text-gray-400 hover:text-white text-lg cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-0.5 scrollbar-thin scrollbar-thumb-white/5">
          {chess.history.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-xs text-gray-600 italic">
              Aún no hay movimientos registrados.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {Array.from({ length: Math.ceil(chess.history.length / 2) }).map((_, idx) => {
                const moveNum = idx + 1;
                const whiteMove = chess.history[idx * 2];
                const blackMove = chess.history[idx * 2 + 1] || '';
                return (
                  <div key={moveNum} className="grid grid-cols-3 text-sm py-1.5 border-b border-white/5 font-mono text-gray-400">
                    <span className="text-gray-600 font-semibold">{moveNum}.</span>
                    <span>{whiteMove}</span>
                    <span className="text-gray-300">{blackMove}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drawer Derecho - Chat y Acciones */}
      <div className={`fixed inset-y-0 right-0 z-40 w-[300px] sm:w-[360px] bg-neutral-950/95 border-l border-white/10 p-6 flex flex-col gap-4 transition-transform duration-300 transform ${
        rightDrawerOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:hidden backdrop-blur-md`}>
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <span className="text-sm font-bold text-white uppercase tracking-wider font-display">Chat y Controles</span>
          <button 
            onClick={() => setRightDrawerOpen(false)} 
            className="text-gray-400 hover:text-white text-lg cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col">
          <ChatPanel 
            messages={chatMessages}
            onSendMessage={(text) => {
              handleSendChatMessage(text);
            }}
            disabled={isAiMode}
          />
        </div>

        <div className="pt-2 border-t border-white/5">
          <GameControls 
            onResign={() => {
              const winnerColor = playerColor === 'white' ? 'black' : 'white';
              chess.forceResign(winnerColor);
              if (!isAiMode) {
                sendMessage('peer-left', { reason: 'resign' });
              }
              setRightDrawerOpen(false);
            }}
            onOfferDraw={() => {
              if (isAiMode) {
                alert('La computadora ha declinado la oferta de tablas.');
              } else {
                sendMessage('chat-message', { text: '🚩 Ofrezco tablas en la partida.' });
                alert('Solicitud de tablas enviada por el chat.');
              }
              setRightDrawerOpen(false);
            }}
            onReset={handleRequestRematch}
            canReset={chess.isGameOver}
          />
        </div>
      </div>

      {/* Fondo borroso cuando cualquier cajón móvil está abierto */}
      {(leftDrawerOpen || rightDrawerOpen) && (
        <div 
          onClick={() => {
            setLeftDrawerOpen(false);
            setRightDrawerOpen(false);
          }}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* --- MODALES Y OVERLAYS --- */}

      {/* Modal: Esperando aprobación de revancha (Host side) */}
      {waitingForRematchApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-accent-violet animate-pulse" />
            <div className="w-12 h-12 border-4 border-accent-violet/20 border-t-accent-violet rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Esperando al Rival</h3>
            <p className="text-sm text-gray-400">Solicitud de revancha enviada. Esperando que el rival acepte...</p>
          </div>
        </div>
      )}

      {/* Modal: Recibida solicitud de revancha (Guest side) */}
      {hasRematchRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-violet to-accent-cyan" />
            <h3 className="text-lg font-bold text-white mb-2">¡Solicitud de Revancha!</h3>
            <p className="text-sm text-gray-400 mb-6">El rival te ha desafiado a una nueva partida en esta misma sesión.</p>
            <div className="flex gap-4">
              <button
                onClick={handleDeclineRematch}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-sm font-semibold transition-all cursor-pointer"
              >
                Rechazar
              </button>
              <button
                onClick={handleAcceptRematch}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan hover:opacity-90 text-white text-sm font-semibold transition-all shadow-lg shadow-accent-violet/20 cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Sorteo de Colores Animado */}
      {drawStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative p-8 max-w-sm w-full mx-4 flex flex-col items-center justify-center">
            {drawStatus === 'shuffling' ? (
              <div className="flex flex-col items-center gap-6 animate-pulse">
                {/* Corona giratoria */}
                <div className="relative w-24 h-24 rounded-full flex items-center justify-center border-4 border-dashed border-accent-violet animate-spin">
                  <span className="text-4xl">👑</span>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest font-mono">Sorteando Colores</h3>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    {tempColor === 'white' ? '⚪ BLANCAS' : '⚫ NEGRAS'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 text-center animate-scale-up">
                {drawnColor === 'white' ? (
                  <>
                    <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.4)] border border-neutral-200 animate-bounce">
                      <span className="text-6xl text-black filter drop-shadow">♔</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-wide uppercase font-display">
                        Juegas con Blancas
                      </h3>
                      <p className="text-sm text-accent-cyan font-semibold mt-2 animate-pulse">
                        ¡Tienes el primer movimiento! ⚪
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-28 h-28 rounded-full bg-neutral-950 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)] border border-neutral-800 animate-bounce">
                      <span className="text-6xl text-white filter drop-shadow">♚</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-wide uppercase font-display">
                        Juegas con Negras
                      </h3>
                      <p className="text-sm text-accent-violet font-semibold mt-2 animate-pulse">
                        El rival inicia la partida ⚫
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
