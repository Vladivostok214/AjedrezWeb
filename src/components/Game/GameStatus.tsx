import React from 'react';
import { formatTime } from '../../utils';

interface GameStatusProps {
  turn: 'w' | 'b';
  isGameOver: boolean;
  gameOverReason: string | null;
  clocks: { w: number; b: number };
  playerColor: 'white' | 'black';
  history: string[];
  capturedPieces: {
    w: Record<string, number>;
    b: Record<string, number>;
  };
  isAiMode?: boolean;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  turn,
  isGameOver,
  gameOverReason,
  clocks,
  playerColor,
  history,
  capturedPieces,
  isAiMode = false
}) => {
  // Agrupar movimientos de 2 en 2 para mostrarlos como jugadas (1. e4 e5)
  const renderMovesLog = () => {
    const moves: React.ReactNode[] = [];
    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = history[i];
      const blackMove = history[i + 1] || '';
      
      moves.push(
        <div key={moveNum} className="grid grid-cols-3 text-xs py-1 border-b border-white/5 font-mono text-gray-400">
          <span className="text-gray-600 font-semibold">{moveNum}.</span>
          <span>{whiteMove}</span>
          <span className="text-gray-300">{blackMove}</span>
        </div>
      );
    }
    return moves;
  };

  const isWhiteActive = turn === 'w' && !isGameOver && history.length > 0;
  const isBlackActive = turn === 'b' && !isGameOver && history.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Relojes y Jugadores (Panel Síncrono) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Jugador Blanco */}
        <div className={`glass-panel p-4 rounded-xl border transition-all duration-300 ${
          isWhiteActive 
            ? 'border-accent-violet/40 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-accent-violet/5' 
            : 'border-white/5 bg-black/20'
        }`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Blancas</span>
            {isWhiteActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-ping" />}
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
            {formatTime(clocks.w)}
          </div>
          {/* Piezas capturadas por las blancas (es decir, las piezas negras capturadas) */}
          <div className="text-[10px] text-gray-400 min-h-[14px]">
            {Object.entries(capturedPieces.b).map(([piece, count]) => (
              count > 0 ? <span key={piece} className="inline-block mr-1 bg-white/5 px-1 rounded">{piece.toUpperCase()}×{count}</span> : ''
            ))}
          </div>
          <span className="text-[9px] text-gray-600 font-medium uppercase mt-2 block">
            {playerColor === 'white' ? (isAiMode ? 'Tú (Humano)' : 'Tú') : (isAiMode ? 'CPU (Blancas)' : 'Rival')}
          </span>
        </div>

        {/* Jugador Negro */}
        <div className={`glass-panel p-4 rounded-xl border transition-all duration-300 ${
          isBlackActive 
            ? 'border-accent-cyan/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-accent-cyan/5' 
            : 'border-white/5 bg-black/20'
        }`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Negras</span>
            {isBlackActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-ping" />}
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
            {formatTime(clocks.b)}
          </div>
          {/* Piezas capturadas por las negras (es decir, las piezas blancas capturadas) */}
          <div className="text-[10px] text-gray-400 min-h-[14px]">
            {Object.entries(capturedPieces.w).map(([piece, count]) => (
              count > 0 ? <span key={piece} className="inline-block mr-1 bg-white/5 px-1 rounded">{piece.toUpperCase()}×{count}</span> : ''
            ))}
          </div>
          <span className="text-[9px] text-gray-600 font-medium uppercase mt-2 block">
            {playerColor === 'black' ? 'Tú' : (isAiMode ? 'CPU (Negras)' : 'Rival')}
          </span>
        </div>
      </div>

      {/* Estado del Turno / Fin del Juego */}
      {isGameOver ? (
        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-center text-xs text-red-400 font-bold uppercase tracking-wider">
          🏆 {gameOverReason}
        </div>
      ) : (
        <div className="p-2.5 bg-neutral-900/60 border border-white/5 rounded-xl text-center text-xs text-gray-400 font-medium">
          {history.length === 0 ? (
            <span>Mueve una pieza para arrancar el reloj</span>
          ) : (
            <span>Turno de las {turn === 'w' ? 'Blancas' : 'Negras'}</span>
          )}
        </div>
      )}

      {/* Registro de Movimientos */}
      <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col h-[180px]">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Registro de Jugadas</span>
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-0.5 scrollbar-thin scrollbar-thumb-white/5">
          {history.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-[10px] text-gray-600 italic">
              Aún no hay movimientos registrados.
            </div>
          ) : (
            renderMovesLog()
          )}
        </div>
      </div>
    </div>
  );
};
