import { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  fen?: string;
}

export const useChessGame = () => {
  const chessRef = useRef(new Chess());
  
  const [fen, setFen] = useState<string>(chessRef.current.fen());
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [history, setHistory] = useState<string[]>([]);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [isAiMode, setIsAiMode] = useState<boolean>(false);
  
  // Relojes de ajedrez (10 minutos por defecto = 600 segundos)
  const [clocks, setClocks] = useState({ w: 600, b: 600 });

  const [capturedPieces, setCapturedPieces] = useState({
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
  });

  const updateGameState = useCallback(() => {
    const game = chessRef.current;
    setFen(game.fen());
    setHistory(game.history());
    setTurn(game.turn());
    
    const over = game.isGameOver();
    setIsGameOver(over);
    
    if (over) {
      if (game.isCheckmate()) {
        setGameOverReason(game.turn() === 'w' ? 'Jaque mate (Gana la Computadora)' : 'Jaque mate (¡Ganaste tú!)');
      } else if (game.isDraw()) {
        if (game.isStalemate()) {
          setGameOverReason('Tablas (Rey ahogado)');
        } else if (game.isThreefoldRepetition()) {
          setGameOverReason('Tablas (Triple repetición)');
        } else if (game.isInsufficientMaterial()) {
          setGameOverReason('Tablas (Material insuficiente)');
        } else {
          setGameOverReason('Tablas (Regla de 50 movimientos o acuerdo)');
        }
      } else {
        setGameOverReason('Partida finalizada');
      }
    } else {
      setGameOverReason(null);
    }

    // Calcular las piezas capturadas restando las actuales de un set inicial estándar
    const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCounts = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    
    const board = game.board();
    for (const row of board) {
      for (const square of row) {
        if (square) {
          const { color, type } = square;
          if (type !== 'k') { // El rey no se puede capturar
            currentCounts[color][type]++;
          }
        }
      }
    }
    
    setCapturedPieces({
      w: {
        p: Math.max(0, initialCounts.p - currentCounts.w.p),
        n: Math.max(0, initialCounts.n - currentCounts.w.n),
        b: Math.max(0, initialCounts.b - currentCounts.w.b),
        r: Math.max(0, initialCounts.r - currentCounts.w.r),
        q: Math.max(0, initialCounts.q - currentCounts.w.q),
      },
      b: {
        p: Math.max(0, initialCounts.p - currentCounts.b.p),
        n: Math.max(0, initialCounts.n - currentCounts.b.n),
        b: Math.max(0, initialCounts.b - currentCounts.b.b),
        r: Math.max(0, initialCounts.r - currentCounts.b.r),
        q: Math.max(0, initialCounts.q - currentCounts.b.q),
      }
    });
  }, []);

  const makeMove = useCallback((from: string, to: string, pieceType?: string): boolean => {
    try {
      const isPawn = pieceType ? pieceType.toLowerCase().endsWith('p') : false;
      const isPromotionSquare = to.endsWith('8') || to.endsWith('1');
      const promotion = (isPawn && isPromotionSquare) ? 'q' : undefined;

      const move = chessRef.current.move({
        from,
        to,
        promotion
      });
      if (move) {
        updateGameState();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [updateGameState]);

  const opponentMove = useCallback((move: ChessMove, opponentTimeLeft?: number) => {
    try {
      chessRef.current.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined
      });
      updateGameState();

      // Sincronizar el reloj del oponente al recibir su jugada
      if (opponentTimeLeft !== undefined) {
        const opponentColorKey = boardOrientation === 'white' ? 'b' : 'w';
        setClocks(prev => ({
          ...prev,
          [opponentColorKey]: opponentTimeLeft
        }));
      }
    } catch (e) {
      console.error("Error aplicando el movimiento del oponente:", e);
    }
  }, [boardOrientation, updateGameState]);

  const forceResign = useCallback((winnerColor: 'white' | 'black') => {
    setIsGameOver(true);
    setGameOverReason(winnerColor === 'white' ? 'Abandono (Ganan Blancas)' : 'Abandono (Ganan Negras)');
  }, []);

  const resetGame = useCallback(() => {
    chessRef.current.reset();
    setClocks({ w: 600, b: 600 });
    updateGameState();
  }, [updateGameState]);

  // Inteligencia Artificial Heurística Ligera para la CPU
  const makeAiMove = useCallback(() => {
    const game = chessRef.current;
    if (game.isGameOver()) return;

    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    let selectedMove = moves[Math.floor(Math.random() * moves.length)];

    const checkmateMoves = moves.filter((m) => m.san.includes('#'));
    const checkMoves = moves.filter((m) => m.san.includes('+'));
    const captureMoves = moves.filter((m) => m.captured);

    if (checkmateMoves.length > 0) {
      selectedMove = checkmateMoves[0];
    } else if (captureMoves.length > 0) {
      const pieceValues: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
      captureMoves.sort((a, b) => {
        const valA = pieceValues[a.captured || 'p'] || 1;
        const valB = pieceValues[b.captured || 'p'] || 1;
        return valB - valA;
      });
      selectedMove = captureMoves[0];
    } else if (checkMoves.length > 0) {
      selectedMove = checkMoves[Math.floor(Math.random() * checkMoves.length)];
    }

    try {
      game.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion || undefined
      });
      updateGameState();
    } catch (e) {
      console.error("Error al ejecutar jugada de la CPU:", e);
    }
  }, [updateGameState]);

  // Efecto reactivo para programar el movimiento de la CPU
  useEffect(() => {
    if (!isAiMode || isGameOver) return;

    const isAiTurn = (boardOrientation === 'white' && turn === 'b') || 
                      (boardOrientation === 'black' && turn === 'w');

    if (isAiTurn) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAiMode, turn, boardOrientation, isGameOver, makeAiMove]);

  // Efecto para descontar el tiempo de los relojes en tiempo real
  useEffect(() => {
    // El reloj solo corre si ya se inició la partida (history no vacío) y no se ha acabado el juego
    if (history.length === 0 || isGameOver) return;

    const timerInterval = setInterval(() => {
      setClocks((prev) => {
        const currentRemaining = prev[turn];
        if (currentRemaining <= 1) {
          // Si el tiempo llegó a 0, se declara fin del juego
          clearInterval(timerInterval);
          setIsGameOver(true);
          setGameOverReason(turn === 'w' ? 'Tiempo agotado (Ganan Negras)' : 'Tiempo agotado (Ganan Blancas)');
          return {
            ...prev,
            [turn]: 0
          };
        }
        return {
          ...prev,
          [turn]: currentRemaining - 1
        };
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [turn, history.length, isGameOver]);

  return {
    fen,
    boardOrientation,
    setBoardOrientation,
    history,
    turn,
    isGameOver,
    gameOverReason,
    makeMove,
    opponentMove,
    forceResign,
    resetGame,
    capturedPieces,
    isAiMode,
    setIsAiMode,
    clocks,
    setClocks
  };
};
