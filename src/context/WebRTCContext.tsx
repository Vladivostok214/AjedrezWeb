import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  permissionError: string | null;
  requestMediaPermissions: () => Promise<MediaStream | null>;
  initiateCall: () => Promise<void>;
  handleIncomingOffer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIncomingAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIncomingIce: (candidate: RTCIceCandidateInit) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setOnSignalGenerated: (callback: (type: string, payload: any) => void) => void;
  closeConnection: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const onSignalGeneratedRef = useRef<((type: string, payload: any) => void) | null>(null);

  const setOnSignalGenerated = useCallback((callback: (type: string, payload: any) => void) => {
    onSignalGeneratedRef.current = callback;
  }, []);

  // Detiene todas las pistas de un stream
  const stopStream = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const closeConnection = useCallback(() => {
    console.log('Cerrando conexión WebRTC y limpiando recursos...');
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('new');
    setIsAudioMuted(false);
    setIsVideoMuted(false);
  }, []);

  // Solicita acceso a hardware de audio y video
  const requestMediaPermissions = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      console.log('Solicitando getUserMedia con constraints explícitos de audio...');
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,  // Cancelación acústica
          noiseSuppression: true,  // Supresión de ruido
          autoGainControl: true    // Ajuste dinámico de volumen
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPermissionError(null);

      // Si la conexión de peer ya existe, agregamos los tracks inmediatamente
      if (peerConnectionRef.current) {
        const pc = peerConnectionRef.current;
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      return stream;
    } catch (err: any) {
      console.error('Error al acceder a dispositivos multimedia:', err);
      setPermissionError(err.message || 'Permiso denegado de cámara/micrófono');
      return null;
    }
  }, []);

  // Inicializa la conexión RTCPeerConnection
  const initPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    console.log('Inicializando nueva instancia RTCPeerConnection...');
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Servidor STUN gratuito de Google
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && onSignalGeneratedRef.current) {
        onSignalGeneratedRef.current('ice-candidate', { candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`WebRTC Connection State changed to: ${pc.connectionState}`);
      setConnectionState(pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log('Remoto track recibido. Guardando stream...');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Añade los tracks locales existentes a la conexión
    if (localStreamRef.current) {
      const stream = localStreamRef.current;
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // Inicia llamada (Genera Oferta SDP)
  const initiateCall = useCallback(async () => {
    try {
      const pc = initPeerConnection();
      console.log('Creando WebRTC Offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (onSignalGeneratedRef.current) {
        onSignalGeneratedRef.current('webrtc-offer', { sdp: offer });
      }
    } catch (err) {
      console.error('Error al iniciar la llamada (Offer):', err);
    }
  }, [initPeerConnection]);

  // Maneja oferta remota entrante y genera respuesta SDP
  const handleIncomingOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    try {
      const pc = initPeerConnection();
      console.log('Seteando oferta remota y creando Answer...');
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (onSignalGeneratedRef.current) {
        onSignalGeneratedRef.current('webrtc-answer', { sdp: answer });
      }
    } catch (err) {
      console.error('Error al manejar oferta entrante:', err);
    }
  }, [initPeerConnection]);

  // Maneja respuesta remota entrante
  const handleIncomingAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        console.log('Seteando respuesta remota...');
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    } catch (err) {
      console.error('Error al manejar respuesta entrante:', err);
    }
  }, []);

  // Agrega candidato ICE remoto recibido
  const handleIncomingIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        console.log('Agregando ICE candidato remoto...');
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error al agregar candidato ICE remoto:', err);
    }
  }, []);

  // Enciende/apaga micrófono local
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        console.log(`Micrófono local ${audioTrack.enabled ? 'activado' : 'desactivado'}`);
      }
    }
  }, []);

  // Enciende/apaga cámara local
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
        console.log(`Cámara local ${videoTrack.enabled ? 'activada' : 'desactivada'}`);
      }
    }
  }, []);

  // Cleanup automático al desmontar el Provider
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  const value: WebRTCContextType = {
    localStream,
    remoteStream,
    connectionState,
    isAudioMuted,
    isVideoMuted,
    permissionError,
    requestMediaPermissions,
    initiateCall,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingIce,
    toggleAudio,
    toggleVideo,
    setOnSignalGenerated,
    closeConnection
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC debe ser usado dentro de un WebRTCProvider');
  }
  return context;
};
