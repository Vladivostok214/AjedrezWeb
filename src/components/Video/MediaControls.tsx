import React from 'react';

interface MediaControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo
}) => {
  return (
    <div className="flex gap-2.5">
      {/* Mic toggle */}
      <button 
        onClick={onToggleAudio}
        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 ${
          isAudioMuted 
            ? 'bg-red-600/80 border-red-500/50 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
            : 'bg-neutral-900/80 border-white/10 text-gray-300 hover:bg-neutral-800'
        }`}
        title={isAudioMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
      >
        {isAudioMuted ? (
          <span className="text-xs">🎙️❌</span>
        ) : (
          <span className="text-xs">🎙️</span>
        )}
      </button>

      {/* Camera toggle */}
      <button 
        onClick={onToggleVideo}
        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 ${
          isVideoMuted 
            ? 'bg-red-600/80 border-red-500/50 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
            : 'bg-neutral-900/80 border-white/10 text-gray-300 hover:bg-neutral-800'
        }`}
        title={isVideoMuted ? 'Encender cámara' : 'Apagar cámara'}
      >
        {isVideoMuted ? (
          <span className="text-xs">📹❌</span>
        ) : (
          <span className="text-xs">📹</span>
        )}
      </button>
    </div>
  );
};
