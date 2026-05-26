# ♟️ Ajedrez 1v1 Online (Chess + Clocks + Chat)

Una plataforma web de alto rendimiento y estética *Noir-Tech* diseñada para jugar ajedrez 1v1 en tiempo real de forma ultra-ligera, incluyendo relojes de ajedrez sincronizados, historial de jugadas algebraicas y chat integrado.

---

## 🚀 Arquitectura del Proyecto

- **Frontend**: React 19, Vite y Tailwind CSS v4.
- **Motor de Juego**: `chess.js` (reglas y turnos) y `react-chessboard` v5 (UI arrastrable).
- **Reloj de Ajedrez**: Implementación sincrónica local en React con compensación de latencia de red.
- **Canal en Tiempo Real**: WebSocket nativo Node.js (`ws`) con mecanismo de Heartbeat (Ping-Pong) para mantener la conexión activa en plataformas PaaS.
- **Orquestación**: Patrón orquestador (`RoomPage`) que aísla la lógica del juego de la capa de comunicación de red.

---

## 🛠️ Ejecución Local

Para probar el proyecto completo en tu máquina:

### 1. Iniciar el Servidor de Señalización (Backend)
Entra en la carpeta del servidor e inícialo:
```bash
cd server
npm start
```
El servidor se levantará por defecto en el puerto `3001` (`ws://localhost:3001`).

### 2. Iniciar el Frontend (Vite)
Abre otra terminal en la raíz del proyecto e inicia el servidor de desarrollo:
```bash
npm run dev
```
El cliente se abrirá en `http://localhost:5173`. 
- Haz clic en **"Crear Partida"** para entrar a una sala (ej: `http://localhost:5173/room/mi-sala`).
- Comparte el enlace para conectar a ambos jugadores e iniciar los relojes de juego y el chat en tiempo real.
- O haz clic en **"Jugar contra la Computadora (Offline)"** para entrenar de forma local e independiente de internet.

---

## 📦 Guía de Despliegue en Producción

### 1. Frontend (Vercel)
Este frontend está optimizado para compilarse estáticamente y desplegarse en Vercel:
- **Enrutador de SPA**: Incluye un archivo [vercel.json](file:///C:/Users/WLADI/Antigravity_Tests/AjedrezWeb/vercel.json) en la raíz que redirige todas las rutas al `index.html` para evitar errores `404` al refrescar rutas como `/room/:id`.
- **Variable de Entorno**: En el panel de control de tu proyecto en Vercel, añade la variable apuntando a tu backend en producción:
  ```env
  VITE_SIGNALING_URL = wss://tu-servidor-signaling.onrender.com
  ```

### 2. Servidor de Señalización (Render / Railway / Fly.io)
El backend en la carpeta `/server` requiere un entorno de ejecución continuo y persistente compatible con WebSockets:
- **Build Command**: `npm install` (el build command de Render por defecto `npm run build` terminará correctamente gracias a un script simulado).
- **Start Command**: `npm start`.
