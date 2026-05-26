import React from 'react';
import { Chessboard, type ChessboardOptions } from 'react-chessboard';

interface BoardWrapperProps {
  fen: string;
  orientation: 'white' | 'black';
  onPieceDrop: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
}

export const BoardWrapper: React.FC<BoardWrapperProps> = ({ 
  fen, 
  orientation, 
  onPieceDrop 
}) => {
  const options: ChessboardOptions = {
    position: fen,
    boardOrientation: orientation,
    onPieceDrop: ({ sourceSquare, targetSquare, piece }) => {
      if (!targetSquare) return false;
      // react-chessboard v5 pasa el pieceType en piece (ej. 'wP', 'bN')
      return onPieceDrop(sourceSquare, targetSquare, piece.pieceType);
    },
    boardStyle: {
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
    },
    darkSquareStyle: { backgroundColor: '#1c191f' }, // Grafito/carbón oscuro Noir-Tech
    lightSquareStyle: { backgroundColor: '#ebe9f0' }, // Platino claro premium
    allowDragging: true
  };

  return (
    <div className="w-full max-w-[550px] aspect-square rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative bg-neutral-900 p-2">
      <Chessboard options={options} />
    </div>
  );
};
