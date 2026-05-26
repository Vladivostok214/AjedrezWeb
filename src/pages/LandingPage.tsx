import React from 'react';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';

export const LandingPage: React.FC = () => {
  const handleCreateRoom = () => {
    // Generar un UUID aleatorio para la sala online
    const randomRoomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    window.location.href = `/room/${randomRoomId}`;
  };

  const handlePlayVsAi = () => {
    // Redirigir a la sala especial de Inteligencia Artificial offline
    window.location.href = '/room/offline-ai';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="max-w-md w-full flex flex-col items-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-violet to-accent-cyan flex items-center justify-center mb-6 shadow-lg shadow-accent-violet/20 text-3xl">
          👑
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-white uppercase font-display bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
          Ajedrez 1v1 P2P
        </h1>
        
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          Crea una sala al instante y comparte el enlace con un amigo para jugar con videollamada integrada, o entrena solo contra la computadora de forma offline.
        </p>
        
        <div className="flex flex-col gap-3 w-full">
          <Button 
            variant="primary" 
            onClick={handleCreateRoom} 
            className="w-full py-3 text-base shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            Jugar Partida Online (1v1)
          </Button>

          <Button 
            variant="secondary" 
            onClick={handlePlayVsAi} 
            className="w-full py-3 text-base border border-white/10 hover:border-accent-cyan/30"
          >
            Jugar contra la Computadora (Offline)
          </Button>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 w-full flex justify-around text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span>🛡️</span> WebRTC Seguro
          </div>
          <div className="flex items-center gap-1.5">
            <span>🤖</span> CPU Offline
          </div>
          <div className="flex items-center gap-1.5">
            <span>⚡</span> Sin Registro
          </div>
        </div>
      </Card>
    </div>
  );
};
