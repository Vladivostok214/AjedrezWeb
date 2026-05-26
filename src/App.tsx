import { SocketProvider } from './context/SocketContext';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';

function App() {
  // Enrutamiento condicional ultra-ligero nativo sin dependencias externas
  const path = window.location.pathname;
  const isRoom = path.startsWith('/room/');

  return (
    <SocketProvider>
      <main className="flex-1 w-full h-full flex flex-col justify-center items-center">
        {isRoom ? <RoomPage /> : <LandingPage />}
      </main>
    </SocketProvider>
  );
}

export default App;
