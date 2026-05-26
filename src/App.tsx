import { SocketProvider } from './context/SocketContext';
import { WebRTCProvider } from './context/WebRTCContext';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';

function App() {
  // Enrutamiento condicional ultra-ligero nativo sin dependencias externas
  const path = window.location.pathname;
  const isRoom = path.startsWith('/room/');

  return (
    <SocketProvider>
      <WebRTCProvider>
        <main className="flex-1 w-full h-full flex flex-col justify-center items-center">
          {isRoom ? <RoomPage /> : <LandingPage />}
        </main>
      </WebRTCProvider>
    </SocketProvider>
  );
}

export default App;
