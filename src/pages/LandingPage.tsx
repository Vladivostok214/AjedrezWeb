import React, { useState } from 'react';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';

export const LandingPage: React.FC = () => {
  const [customRoomId, setCustomRoomId] = useState<string>('');

  const handleCreateRoom = () => {
    // Si el usuario escribió un nombre de sala, lo usamos; si no, generamos uno aleatorio de 8 caracteres
    const roomId = customRoomId.trim()
      ? customRoomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : Math.random().toString(36).substring(2, 10);

    window.location.href = `/room/${roomId}`;
  };

  const handlePlayVsAi = () => {
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
          Crea una sala personalizada o aleatoria para jugar con un amigo con videollamada integrada, o entrena solo contra la CPU offline.
        </p>

        {/* Input para nombre de sala personalizada */}
        <div className="w-full flex flex-col gap-1 mb-5">
          <label className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
            Nombre de Sala Personalizada (Opcional)
          </label>
          <input 
            type="text"
            placeholder="Ej: mi-sala-permanente"
            value={customRoomId}
            onChange={(e) => setCustomRoomId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet transition-all text-center"
          />
          <span className="text-[10px] text-gray-600 text-left mt-1">
            * Útil para tener un enlace de invitación estático.
          </span>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
          <Button 
            variant="primary" 
            onClick={handleCreateRoom} 
            className="w-full py-3 text-base shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            {customRoomId.trim() ? 'Crear / Unirse a Sala' : 'Crear Partida Online (1v1)'}
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
