import React from 'react';
import { VideoPlayer } from './VideoPlayer';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLocalAudioMuted: boolean;
  isLocalVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStream,
  isLocalAudioMuted,
  isLocalVideoMuted,
  onToggleAudio,
  onToggleVideo
}) => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Oponente Video */}
      <div className="flex-1 min-h-[160px] relative">
        <VideoPlayer 
          stream={remoteStream} 
          label="Oponente (Rival)" 
          isMuted={false} 
        />
      </div>

      {/* Local Video */}
      <div className="flex-1 min-h-[160px] relative">
        <VideoPlayer 
          stream={localStream} 
          label="Tú (Local)" 
          isMuted={true} // Siempre silenciado localmente para evitar feedback
          isControlsEnabled={true}
          isAudioMuted={isLocalAudioMuted}
          isVideoMuted={isLocalVideoMuted}
          onToggleAudio={onToggleAudio}
          onToggleVideo={onToggleVideo}
        />
      </div>
    </div>
  );
};
