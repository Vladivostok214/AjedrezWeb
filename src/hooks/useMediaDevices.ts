import { useWebRTC } from '../context/WebRTCContext';

export const useMediaDevices = () => {
  const {
    localStream,
    permissionError,
    isAudioMuted,
    isVideoMuted,
    requestMediaPermissions,
    toggleAudio,
    toggleVideo,
    closeConnection
  } = useWebRTC();

  return {
    stream: localStream,
    permissionError,
    isAudioMuted,
    isVideoMuted,
    getMediaStream: requestMediaPermissions,
    toggleAudio,
    toggleVideo,
    stopStream: closeConnection
  };
};
