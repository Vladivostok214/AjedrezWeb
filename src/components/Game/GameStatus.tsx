import React from 'react';

interface GameStatusProps {
  turn: 'w' | 'b';
  isGameOver: boolean;
  gameOverReason: string | null;
  capturedPieces: {
    w: Record<string, number>;
    b: Record<string, number>;
  };
}

export const GameStatus: React.FC<GameStatusProps> = ({
  turn,
  isGameOver,
  gameOverReason,
  capturedPieces
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Estado de la partida</span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-violet/20 text-accent-violet font-semibold border border-accent-violet/30 animate-pulse">
          {turn === 'w' ? 'Turno Blancas' : 'Turno Negras'}
        </span>
      </div>

      {isGameOver && (
        <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-sm text-red-400">
          <strong>Fin de partida:</strong> {gameOverReason}
        </div>
      )}

      {/* Captured Pieces info */}
      <div className="grid grid-cols-2 gap-4 mt-1 border-t border-white/5 pt-3">
        <div>
          <span className="text-xs text-gray-500 block mb-1">Blancas capturadas</span>
          <div className="text-sm font-semibold tracking-wider text-gray-300">
            {Object.entries(capturedPieces.w).map(([piece, count]) => (
              count > 0 ? `${piece.toUpperCase()}:${count} ` : ''
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500 block mb-1">Negras capturadas</span>
          <div className="text-sm font-semibold tracking-wider text-gray-300">
            {Object.entries(capturedPieces.b).map(([piece, count]) => (
              count > 0 ? `${piece.toUpperCase()}:${count} ` : ''
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
