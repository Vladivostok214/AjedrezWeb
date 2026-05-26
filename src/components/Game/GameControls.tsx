import React from 'react';
import { Button } from '../Common/Button';

interface GameControlsProps {
  onResign: () => void;
  onOfferDraw: () => void;
  onReset: () => void;
  canReset: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onResign,
  onOfferDraw,
  onReset,
  canReset
}) => {
  return (
    <div className="flex flex-wrap gap-2 w-full">
      <Button 
        variant="danger" 
        onClick={onResign}
        className="flex-1 min-w-[120px] text-sm"
      >
        Rendirse
      </Button>
      
      <Button 
        variant="secondary" 
        onClick={onOfferDraw}
        className="flex-1 min-w-[120px] text-sm"
      >
        Ofrecer Tablas
      </Button>

      {canReset && (
        <Button 
          variant="primary" 
          onClick={onReset}
          className="w-full text-sm mt-1"
        >
          Nueva Partida
        </Button>
      )}
    </div>
  );
};
