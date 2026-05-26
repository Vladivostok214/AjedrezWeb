import React, { useEffect, useState } from 'react';
import { BoardWrapper } from '../components/Game/BoardWrapper';
import { GameStatus } from '../components/Game/GameStatus';
import { GameControls } from '../components/Game/GameControls';
import { VideoGrid } from '../components/Video/VideoGrid';
import { useChessGame } from '../hooks/useChessGame';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../context/WebRTCContext';

export const RoomPage: React.FC = () => {
  const roomId = window.location.pathname.split('/').pop() || '';
  const isAiMode = roomId === 'offline-ai';
  
  // Hooks de lógica local
  const chess = useChessGame();
  const media = useMediaDevices();
  
  // Contextos de transporte y multimedia (Solo para modo online)
  const { registerHandler, sendMessage, connected: socketConnected } = useSocket();
  const { 
    remoteStream, 
    connectionState: webrtcConnectionState,
    initiateCall, 
    handleIncomingOffer, 
    handleIncomingAnswer, 
    handleIncomingIce, 
    setOnSignalGenerated 
  } = useWebRTC();

  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [opponentPresent, setOpponentPresent] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // 1. Vincular señales de WebRTC con el WebSocket de señalización (Solo Online)
  useEffect(() => {
    if (isAiMode) return;
    setOnSignalGenerated((type, payload) => {
      sendMessage(type, payload);
    });
  }, [isAiMode, setOnSignalGenerated, sendMessage]);

  // 2. Solicitar permisos de cámara/micrófono al montar la sala (Solo Online) u activar modo IA
  useEffect(() => {
    if (isAiMode) {
      chess.setIsAiMode(true);
    } else {
      media.getMediaStream();
    }
  }, [isAiMode]);

  // 3. Registrar escuchas de eventos WebSocket (Solo Online)
  useEffect(() => {
    if (isAiMode) return;

    // Al unirse exitosamente a la sala
    const unsubStatus = registerHandler('room-status', (payload: { color: 'white' | 'black' }) => {
      console.log('Asignado color de jugador:', payload.color);
      setPlayerColor(payload.color);
      chess.setBoardOrientation(payload.color);
    });

    // Cuando el oponente entra a la sala
    const unsubJoined = registerHandler('peer-joined', () => {
      console.log('El oponente se ha unido. Iniciando llamada WebRTC...');
      setOpponentPresent(true);
      if (playerColor === 'white') {
        initiateCall();
      }
    });

    // Cuando el oponente sale de la sala
    const unsubLeft = registerHandler('peer-left', () => {
      console.log('El oponente abandonó la sala.');
      setOpponentPresent(false);
      chess.forceResign(playerColor);
    });

    // Oferta WebRTC entrante
    const unsubOffer = registerHandler('webrtc-offer', (payload: { sdp: RTCSessionDescriptionInit }) => {
      console.log('Recibida oferta WebRTC del oponente...');
      setOpponentPresent(true);
      handleIncomingOffer(payload.sdp);
    });

    // Respuesta WebRTC entrante
    const unsubAnswer = registerHandler('webrtc-answer', (payload: { sdp: RTCSessionDescriptionInit }) => {
      console.log('Recibido respuesta WebRTC del oponente...');
      handleIncomingAnswer(payload.sdp);
    });

    // ICE Candidatos
    const unsubIce = registerHandler('ice-candidate', (payload: { candidate: RTCIceCandidateInit }) => {
      handleIncomingIce(payload.candidate);
    });

    // Movimientos del rival
    const unsubChessMove = registerHandler('chess-move', (payload: { from: string, to: string, promotion?: string }) => {
      console.log('Movimiento recibido del rival:', payload);
      chess.opponentMove(payload);
    });

    return () => {
      unsubStatus();
      unsubJoined();
      unsubLeft();
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubChessMove();
    };
  }, [
    isAiMode,
    registerHandler, 
    playerColor, 
    initiateCall, 
    handleIncomingOffer, 
    handleIncomingAnswer, 
    handleIncomingIce, 
    chess
  ]);

  // Manejar el soltado de piezas validando el turno local
  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    // Validar si es el turno del jugador y coincide con su color asignado
    const isMyTurn = (chess.turn === 'w' && playerColor === 'white') || 
                      (chess.turn === 'b' && playerColor === 'black');
    
    if (!isMyTurn) {
      console.warn('Intento de movimiento fuera de turno.');
      return false;
    }

    const success = chess.makeMove(sourceSquare, targetSquare, piece);
    if (success && !isAiMode) {
      const isPawn = piece.toLowerCase().endsWith('p');
      const isPromotionSquare = targetSquare.endsWith('8') || targetSquare.endsWith('1');
      const promotion = (isPawn && isPromotionSquare) ? 'q' : undefined;

      // Enviar jugada al rival (Solo Online)
      sendMessage('chess-move', {
        from: sourceSquare,
        to: targetSquare,
        promotion
      });
    }
    return success;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Determinar la etiqueta del estado de conexión WebRTC para la UI
  const getWebRTCStatusLabel = () => {
    if (isAiMode) return 'Entrenamiento Offline';
    switch (webrtcConnectionState) {
      case 'connected': return 'Llamada Conectada (P2P)';
      case 'connecting': return 'Conectando videollamada...';
      case 'failed': return 'Videollamada fallida (Solo Ajedrez)';
      case 'disconnected': return 'Llamada desconectada';
      default: return opponentPresent ? 'Inicializando llamada...' : 'Esperando rival...';
    }
  };

  const isCpuTurn = chess.turn === (playerColor === 'white' ? 'b' : 'w');

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-7xl mx-auto w-full">
      {/* Cabecera */}
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
          <div className="flex items-center gap-2 mt-1">
            {!isAiMode && (
              <>
                <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] text-gray-400">
                  {socketConnected ? 'Servidor Conectado' : 'Reconectando al Servidor...'}
                </span>
                <span className="text-gray-600 text-[10px]">•</span>
              </>
            )}
            <span className="text-[10px] text-gray-400">{getWebRTCStatusLabel()}</span>
          </div>
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

      {/* Main Grid: Chess y Sidebar (Video / Controles) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Columna Izquierda: Tablero de Ajedrez */}
        <div className="lg:col-span-2 flex items-center justify-center p-4 glass-panel rounded-2xl">
          <BoardWrapper 
            fen={chess.fen}
            orientation={chess.boardOrientation}
            onPieceDrop={handlePieceDrop}
          />
        </div>

        {/* Columna Derecha: Sidebar con Video y Estado del Juego */}
        <div className="flex flex-col gap-6">
          {/* Panel Lateral: Grid de Videos (Online) o Panel de Computadora (Offline) */}
          <div className="flex-1 min-h-[360px] glass-panel p-4 rounded-2xl flex flex-col justify-center">
            {isAiMode ? (
              <div className="flex-grow flex flex-col justify-between py-4 text-center">
                <div className="flex flex-col items-center justify-center flex-grow">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border transition-all duration-500 ${
                    isCpuTurn
                      ? 'bg-accent-cyan/15 border-accent-cyan shadow-[0_0_25px_rgba(6,182,212,0.4)] animate-pulse'
                      : 'bg-neutral-800/80 border-white/5 text-gray-500'
                  }`}>
                    <span className="text-4xl select-none">🤖</span>
                  </div>
                  
                  <h2 className="text-base font-bold text-white mb-1 uppercase font-display tracking-wider">
                    Motor CPU Heurístico
                  </h2>
                  
                  <p className="text-xs text-gray-400 max-w-[220px] mb-6 leading-relaxed">
                    Analiza el tablero localmente, dando prioridad a jaques mates, capturas tácticas y jaques directos.
                  </p>

                  <span className={`text-[10px] px-3.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                    isCpuTurn
                      ? 'bg-accent-cyan/20 border-accent-cyan/30 text-accent-cyan animate-pulse'
                      : 'bg-neutral-800/60 border-white/5 text-gray-500'
                  }`}>
                    {isCpuTurn ? 'Computadora Pensando...' : 'Esperando tu Jugada...'}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <button 
                    onClick={() => {
                      const nextColor = playerColor === 'white' ? 'black' : 'white';
                      setPlayerColor(nextColor);
                      chess.setBoardOrientation(nextColor);
                    }}
                    className="text-xs w-full py-2.5 bg-neutral-900/60 hover:bg-neutral-800 text-gray-300 rounded-lg border border-white/5 transition-all font-medium active:scale-98"
                  >
                    🔄 Cambiar a {playerColor === 'white' ? 'Negras (CPU Inicia)' : 'Blancas'}
                  </button>
                </div>
              </div>
            ) : (
              <VideoGrid 
                localStream={media.stream}
                remoteStream={remoteStream}
                isLocalAudioMuted={media.isAudioMuted}
                isLocalVideoMuted={media.isVideoMuted}
                onToggleAudio={media.toggleAudio}
                onToggleVideo={media.toggleVideo}
              />
            )}
          </div>

          {/* Información del juego y botones */}
          <div className="flex flex-col gap-4">
            <GameStatus 
              turn={chess.turn}
              isGameOver={chess.isGameOver}
              gameOverReason={chess.gameOverReason}
              capturedPieces={chess.capturedPieces}
            />
            
            <GameControls 
              onResign={() => {
                if (isAiMode) {
                  chess.forceResign(playerColor === 'white' ? 'black' : 'white');
                } else {
                  const winnerColor = playerColor === 'white' ? 'black' : 'white';
                  chess.forceResign(winnerColor);
                  sendMessage('peer-left', { reason: 'resign' });
                }
              }}
              onOfferDraw={() => {
                if (isAiMode) {
                  alert('La computadora ha declinado tu oferta de tablas. ¡Sigue jugando!');
                } else {
                  alert('Solicitud de tablas enviada (Simulado)');
                }
              }}
              onReset={chess.resetGame}
              canReset={chess.isGameOver}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
