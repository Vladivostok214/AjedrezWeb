import React, { useRef, useEffect } from 'react';
import { MediaControls } from './MediaControls';

interface VideoPlayerProps {
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
  isControlsEnabled?: boolean;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  label,
  isMuted = false,
  isControlsEnabled = false,
  isAudioMuted = false,
  isVideoMuted = false,
  onToggleAudio,
  onToggleVideo
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full h-full aspect-video rounded-xl overflow-hidden glass-panel relative flex items-center justify-center border border-white/5 bg-black/40">
      {stream && !isVideoMuted ? (
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-xs text-gray-500 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-2 border border-white/5 text-lg">
            👤
          </div>
          {isVideoMuted ? 'Cámara Apagada' : 'Cargando stream...'}
        </div>
      )}
      
      {/* Label overlay */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] text-gray-300 font-semibold border border-white/10 uppercase tracking-wider">
        {label}
      </div>

      {/* Control overlay */}
      {isControlsEnabled && onToggleAudio && onToggleVideo && (
        <div className="absolute bottom-3 right-3 z-10">
          <MediaControls 
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            onToggleAudio={onToggleAudio}
            onToggleVideo={onToggleVideo}
          />
        </div>
      )}
    </div>
  );
};
